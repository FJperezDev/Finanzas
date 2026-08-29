/** Hook compartido: conecta los módulos analíticos al store global del Editor. */
import { useEffect, useRef, useMemo } from "react"; // <-- Añadido useMemo

import {
  calcularBalancesCruzados,
  type BalanceContacto,
  type Contacto,
  type GastoCompartido,
  type FilaTransaccion, // <-- Añadido
} from "../core/calculations";
import { useEditorStore, type EditorState } from "../state/editorStore"; // <-- Añadido EditorState

export interface EstadoDeudas {
  cargando: boolean;
  contactos: Contacto[];
  gastosCompartidos: GastoCompartido[];
  balances: BalanceContacto[];
  crearGastoCompartido: EditorState["crearGastoCompartido"];
  crearContacto: EditorState["crearContacto"];
  eliminarContacto: EditorState["eliminarContacto"];
  subirAvatar: EditorState["subirAvatar"];
  saldarDeuda: EditorState["saldarDeuda"];
}

export function useDeudas(): EstadoDeudas {
  const cargando = useEditorStore((s) => s.cargando);
  const contactos = useEditorStore((s) => s.contactos);
  const gastosCompartidos = useEditorStore((s) => s.gastosCompartidos);
  const crearGastoCompartido = useEditorStore((s) => s.crearGastoCompartido);
  const crearContacto = useEditorStore((s) => s.crearContacto);
  const eliminarContacto = useEditorStore((s) => s.eliminarContacto);
  const subirAvatar = useEditorStore((s) => s.subirAvatar);
  const saldarDeuda = useEditorStore((s) => s.saldarDeuda);

  // Usamos useMemo directamente en lugar de React.useMemo
  const balances = useMemo(
    () => calcularBalancesCruzados(contactos, gastosCompartidos),
    [contactos, gastosCompartidos],
  );

  const peticionLanzada = useRef(false);
  useEffect(() => {
    if (!peticionLanzada.current && useEditorStore.getState().cargando) {
      peticionLanzada.current = true;
      useEditorStore.getState().cargar();
    }
  }, []);

  return {
    cargando,
    contactos,
    gastosCompartidos,
    balances,
    crearGastoCompartido,
    crearContacto,
    eliminarContacto,
    subirAvatar,
    saldarDeuda,
  };
}

export interface EstadoTransacciones {
  cargando: boolean;
  error: string | null;
  filas: FilaTransaccion[];
}

export function conImporteFirmado(filas: FilaTransaccion[]): FilaTransaccion[] {
  return filas.map((f) => ({
    ...f,
    Importe_Firmado: f.Tipo === "Ingreso" ? f.Importe : -f.Importe,
  }));
}

export function useTransacciones(): EstadoTransacciones & {
  recargar: () => void;
} {
  const cargando = useEditorStore((s) => s.cargando);
  const error = useEditorStore((s) => s.error);
  const filas = useEditorStore((s) => s.filas);
  const cargar = useEditorStore((s) => s.cargar);

  const peticionLanzada = useRef(false);

  useEffect(() => {
    if (!peticionLanzada.current && useEditorStore.getState().cargando) {
      peticionLanzada.current = true;
      cargar();
    }
  }, [cargar]);

  return {
    cargando,
    error,
    filas: conImporteFirmado(filas),
    recargar: cargar,
  };
}
