/**
 * Persistencia de la sesión (access + refresh tokens) entre recargas.
 *
 *  - Web:     localStorage (síncrono).
 *  - Nativo:  archivo JSON en el directorio de documentos (expo-file-system).
 *
 * También centraliza la notificación de sesión expirada: cuando el refresco
 * del token falla en una petición, se limpia la sesión y se avisa al store
 * de autenticación para volver al modo invitado (mock).
 */
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";

export interface Sesion {
  access: string;
  refresh: string;
  usuario: string;
}

let sesion: Sesion | null = null;
let manejadorExpiracion: (() => void) | null = null;

const CLAVE_WEB = "finanzas.sesion";
const NOMBRE_ARCHIVO = "finanzas-sesion.json";

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------
function archivoSesion(): File {
  return new File(Paths.document, NOMBRE_ARCHIVO);
}

function leerPersistida(): Sesion | null {
  if (Platform.OS === "web") {
    try {
      const crudo = globalThis.localStorage?.getItem(CLAVE_WEB);
      return crudo ? (JSON.parse(crudo) as Sesion) : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function escribirPersistida(s: Sesion | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (s) globalThis.localStorage?.setItem(CLAVE_WEB, JSON.stringify(s));
      else globalThis.localStorage?.removeItem(CLAVE_WEB);
    } catch {
      // Almacenamiento no disponible: la sesión vive solo en memoria.
    }
    return;
  }
  const archivo = archivoSesion();
  if (s) archivo.write(JSON.stringify(s));
  else if (archivo.exists) archivo.delete();
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export async function cargarSesionPersistida(): Promise<void> {
  if (Platform.OS === "web") {
    sesion = leerPersistida();
    return;
  }
  try {
    const archivo = archivoSesion();
    if (!archivo.exists) {
      sesion = null;
      return;
    }
    const crudo = await archivo.text();
    sesion = crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    sesion = null;
  }
}

export function sesionActual(): Sesion | null {
  return sesion;
}

export function haySesion(): boolean {
  return sesion?.access != null;
}

export async function guardarSesion(nueva: Sesion): Promise<void> {
  sesion = nueva;
  await escribirPersistida(nueva);
}

export async function actualizarTokens(
  access: string,
  refresh: string,
): Promise<void> {
  if (!sesion) return;
  sesion = { ...sesion, access, refresh };
  await escribirPersistida(sesion);
}

export async function limpiarSesion(): Promise<void> {
  sesion = null;
  await escribirPersistida(null);
}

// ---------------------------------------------------------------------------
// Sesión expirada
// ---------------------------------------------------------------------------
export function registrarManejadorExpiracion(manejador: () => void): void {
  manejadorExpiracion = manejador;
}

export async function notificarSesionExpirada(): Promise<void> {
  await limpiarSesion();
  manejadorExpiracion?.();
}
