/** Hook compartido: conecta los módulos analíticos al store global del Editor. */
import { useEffect, useRef } from "react";

import type { FilaTransaccion } from "../core/calculations";
import { useEditorStore } from "../state/editorStore";

export interface EstadoTransacciones {
  cargando: boolean;
  error: string | null;
  filas: FilaTransaccion[];
}

/** Fila de transacción con el importe firmado, como hace `_saneado`. */
export function conImporteFirmado(filas: FilaTransaccion[]): FilaTransaccion[] {
  return filas.map((f) => ({
    ...f,
    Importe_Firmado: f.Tipo === "Ingreso" ? f.Importe : -f.Importe,
  }));
}

export function useTransacciones(): EstadoTransacciones & {
  recargar: () => void;
} {
  // Consumimos directamente el estado global (Zustand)
  const cargando = useEditorStore((s) => s.cargando);
  const error = useEditorStore((s) => s.error);
  const filas = useEditorStore((s) => s.filas);
  const cargar = useEditorStore((s) => s.cargar);

  const peticionLanzada = useRef(false);

  useEffect(() => {
    // Si la app arranca por el Dashboard, el store estará en "cargando: true" por defecto.
    // Lanzamos la carga inicial solo una vez.
    if (!peticionLanzada.current && useEditorStore.getState().cargando) {
      peticionLanzada.current = true;
      cargar();
    }
  }, [cargar]);

  return {
    cargando,
    error,
    // Mantenemos la lógica que necesita el Dashboard (importes firmados)
    filas: conImporteFirmado(filas),
    recargar: cargar,
  };
}
