/**
 * Capa de datos de transacciones con doble implementación:
 *
 *  - Invitado (sin sesión): dataset mock en memoria (xlsxMock), sin
 *    interacción con el backend.
 *  - Autenticado: API de Django con access/refresh tokens (authApi).
 *
 * Misma API pública para todos los consumidores (editorStore, hooks):
 *   - leerTransacciones()        → GET /api/transacciones/ (con Bearer)
 *   - escribirTransacciones()    → POST /api/transacciones/guardar/
 *     (el servidor valida, hace backup y reemplaza)
 *   - generarSeedSiNecesario()   → el backend siembra al arrancar
 *   - exportarXlsx()             → descarga transacciones.xlsx
 */
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";

import type {
  FilaTransaccion,
  Contacto,
  GastoCompartido,
} from "./calculations";
import { peticionAutenticada } from "./authApi";
import { haySesion } from "./tokenStore";
import {
  exportarXlsxMock,
  escribirTransaccionesMock,
  generarSeedSiNecesario as generarSeedMock,
  leerTransaccionesMock,
  leerContactosMock,
  leerGastosCompartidosMock,
  guardarGastoCompartidoMock,
  crearContactoMock,
  eliminarContactoMock,
  subirAvatarMock,
  saldarDeudaMock,
} from "./xlsxMock";
import {
  COLUMNAS_CONTRATO,
  normalizarFecha,
  normalizarImporte,
  ordenarPorFecha,
  validarEsquema,
  type FilaGuardable,
  type PayloadGastoCompartido,
} from "./xlsxCompartido";

// Re-export para los consumidores (editorStore, hooks)
export {
  ordenarPorFecha,
  validarEsquema,
  type FilaGuardable,
} from "./xlsxCompartido";

// ---------------------------------------------------------------------------
// Helpers HTTP
// ---------------------------------------------------------------------------
interface FilaCrudaWeb {
  id: number;
  Fecha: string;
  Tipo: string;
  Categoria_Macro: string;
  Subcategoria: string;
  Concepto: string;
  Importe: number;
  [extra: string]: unknown;
}

async function apiGet<T>(ruta: string): Promise<T> {
  const respuesta = await peticionAutenticada(ruta);
  if (!respuesta.ok) {
    throw new Error(
      `Error del servidor al cargar datos (HTTP ${respuesta.status}).`,
    );
  }
  return (await respuesta.json()) as T;
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
async function leerDeApi(): Promise<FilaTransaccion[]> {
  const datos = await apiGet<{ filas: FilaCrudaWeb[] }>("transacciones/");

  const filas: FilaTransaccion[] = datos.filas.map((filaCruda) => {
    const fila: FilaTransaccion = {
      __id: `srv_${filaCruda.id}`,
      Fecha: normalizarFecha(filaCruda.Fecha),
      Tipo: String(filaCruda.Tipo ?? "").trim(),
      Categoria_Macro: String(filaCruda.Categoria_Macro ?? "").trim(),
      Subcategoria: String(filaCruda.Subcategoria ?? "").trim(),
      Concepto: String(filaCruda.Concepto ?? "").trim(),
      Importe: normalizarImporte(filaCruda.Importe),
    };
    for (const [clave, valor] of Object.entries(filaCruda)) {
      if (!COLUMNAS_CONTRATO.includes(clave) && clave !== "id") {
        fila[clave] = valor == null ? "" : String(valor);
      }
    }
    return fila;
  });

  return ordenarPorFecha(filas);
}

export async function leerTransacciones(): Promise<FilaTransaccion[]> {
  return haySesion() ? leerDeApi() : leerTransaccionesMock();
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
/** Guarda el dataset completo en Django (validación + backup en servidor). */
async function escribirEnApi(filas: FilaGuardable[]): Promise<void> {
  const sinIds = filas.map((fila) => {
    const limpia: Record<string, unknown> = {};
    for (const clave of Object.keys(fila)) {
      if (clave === "__id" || clave === "Importe_Firmado") continue;
      limpia[clave] = fila[clave] ?? "";
    }
    return limpia;
  });

  const respuesta = await peticionAutenticada("transacciones/guardar/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filas: sinIds }),
  });

  const datos = (await respuesta.json().catch(() => ({}))) as {
    errores?: string[];
  };
  if (!respuesta.ok) {
    throw new Error(
      datos.errores?.join(" ") ||
        `Error del servidor al guardar (HTTP ${respuesta.status}).`,
    );
  }
}

export async function escribirTransacciones(
  filas: FilaGuardable[],
): Promise<void> {
  if (haySesion()) await escribirEnApi(filas);
  else await escribirTransaccionesMock(filas);
}

// ---------------------------------------------------------------------------
// Exportación
// ---------------------------------------------------------------------------
function nombreDeDescarga(respuesta: Response): string {
  const disposicion = respuesta.headers.get("Content-Disposition") ?? "";
  const coincidencia = /filename="?([^";]+)"?/.exec(disposicion);
  return coincidencia?.[1] ?? "transacciones.xlsx";
}

/** Descarga transacciones.xlsx del servidor (con Bearer), filtrado por año/mes. */
async function exportarXlsxDeApi(
  anio: number | null,
  mes: number | null,
): Promise<void> {
  const params = new URLSearchParams();
  if (anio != null) params.set("anio", String(anio));
  if (anio != null && mes != null) params.set("mes", String(mes));
  const consulta = params.toString();

  const respuesta = await peticionAutenticada(
    `transacciones/exportar/${consulta ? `?${consulta}` : ""}`,
  );
  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      errores?: string[];
    };
    throw new Error(
      datos.errores?.join(" ") ||
        `Error al exportar (HTTP ${respuesta.status}).`,
    );
  }

  const nombre = nombreDeDescarga(respuesta);
  const blob = await respuesta.blob();

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
    return;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  new File(Paths.document, nombre).write(bytes);
}

export async function exportarXlsx(
  anio: number | null = null,
  mes: number | null = null,
): Promise<void> {
  if (haySesion()) await exportarXlsxDeApi(anio, mes);
  else await exportarXlsxMock(anio, mes);
}

// ---------------------------------------------------------------------------
// Semilla
// ---------------------------------------------------------------------------
/** El backend siembra su base de datos al arrancar; en invitado es un no-op. */
export async function generarSeedSiNecesario(): Promise<boolean> {
  if (!haySesion()) return generarSeedMock();
  await apiGet<{ filas: unknown[] }>("transacciones/");
  return false;
}

// ---------------------------------------------------------------------------
// Sistema de Deudas (Gastos Compartidos)
// ---------------------------------------------------------------------------

export async function leerContactos(): Promise<Contacto[]> {
  if (!haySesion()) return leerContactosMock();

  // Asume que vas a crear una vista simple GET /api/contactos/ en Django
  const datos = await apiGet<{ contactos: Contacto[] }>("contactos/");
  return datos.contactos;
}

export async function leerGastosCompartidos(): Promise<GastoCompartido[]> {
  if (!haySesion()) return leerGastosCompartidosMock();

  // Asume que vas a crear una vista simple GET /api/gastos-compartidos/ en Django
  const datos = await apiGet<{ gastos: GastoCompartido[] }>(
    "gastos-compartidos/",
  );
  return datos.gastos;
}

export async function guardarGastoCompartidoApi(
  payload: PayloadGastoCompartido,
): Promise<void> {
  if (!haySesion()) {
    await guardarGastoCompartidoMock(payload);
    return;
  }

  // Apunta a la ruta que configuramos en el urls.py de Django
  const respuesta = await peticionAutenticada("gastos-compartidos/crear/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      errores?: string[];
    };
    throw new Error(
      datos.errores?.join(" ") ||
        `Error del servidor al registrar deuda (HTTP ${respuesta.status}).`,
    );
  }
}

export async function crearContactoApi(
  payload: Omit<Contacto, "id">,
): Promise<void> {
  if (!haySesion()) {
    await crearContactoMock(payload);
    return;
  }
  const respuesta = await peticionAutenticada("contactos/crear/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      errores?: string[];
    };
    throw new Error(datos.errores?.join(" ") || "Error al crear el contacto.");
  }
}

export async function eliminarContactoApi(id: number): Promise<void> {
  if (!haySesion()) {
    await eliminarContactoMock(id);
    return;
  }

  const respuesta = await peticionAutenticada(`contactos/${id}/eliminar/`, {
    method: "POST",
  });

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      errores?: string[];
    };
    throw new Error(
      datos.errores?.join(" ") || "Error al eliminar el contacto.",
    );
  }
}

export async function subirAvatarApi(
  contactoId: number,
  icono: string | null,
): Promise<void> {
  if (!haySesion()) {
    await subirAvatarMock(contactoId, icono);
    return;
  }

  const respuesta = await peticionAutenticada(`contactos/${contactoId}/avatar/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ icono }),
  });

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      errores?: string[];
    };
    throw new Error(
      datos.errores?.join(" ") || "Error al actualizar el avatar.",
    );
  }
}

export async function saldarDeudaApi(payload: {
  contacto_id: number;
  importe?: number;
  registrar_transaccion: boolean;
}): Promise<void> {
  if (!haySesion()) {
    await saldarDeudaMock(payload);
    return;
  }

  const respuesta = await peticionAutenticada("gastos-compartidos/saldar/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      errores?: string[];
    };
    throw new Error(
      datos.errores?.join(" ") || "Error al saldar la deuda.",
    );
  }
}
