/**
 * Store de autenticación (Zustand).
 *
 * Estados:
 *  - cargando:    restaurando la sesión persistida al arrancar.
 *  - anonimo:     modo invitado → datos mock, sin backend.
 *  - autenticado: sesión activa → datos reales del backend.
 *
 * Tras iniciar/cerrar sesión (o expirar), se recarga el editor para que
 * cambie de fuente de datos (mock ↔ API) de forma transparente.
 */
import { create } from "zustand";

import { apiLogin, apiLogout } from "../core/authApi";
import {
  cargarSesionPersistida,
  guardarSesion,
  limpiarSesion,
  registrarManejadorExpiracion,
  sesionActual,
} from "../core/tokenStore";
import { useEditorStore } from "./editorStore";

export type EstadoSesion = "cargando" | "anonimo" | "autenticado";

export interface AuthState {
  estado: EstadoSesion;
  usuario: string | null;
  restaurarSesion: () => Promise<void>;
  iniciarSesion: (usuario: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  estado: "cargando",
  usuario: null,

  restaurarSesion: async () => {
    await cargarSesionPersistida();
    const sesion = sesionActual();
    set(
      sesion
        ? { estado: "autenticado", usuario: sesion.usuario }
        : { estado: "anonimo", usuario: null },
    );
  },

  iniciarSesion: async (usuario, contrasena) => {
    const par = await apiLogin(usuario, contrasena);
    await guardarSesion({
      access: par.access,
      refresh: par.refresh,
      usuario: par.usuario,
    });
    set({ estado: "autenticado", usuario: par.usuario });
    await useEditorStore.getState().cargar();
  },

  cerrarSesion: async () => {
    await apiLogout().catch(() => undefined);
    await limpiarSesion();
    set({ estado: "anonimo", usuario: null });
    await useEditorStore.getState().cargar();
  },
}));

// ---------------------------------------------------------------------------
// Sesión expirada (el refresco del token falló durante una petición)
// ---------------------------------------------------------------------------
registrarManejadorExpiracion(() => {
  useAuthStore.setState({ estado: "anonimo", usuario: null });
  void useEditorStore.getState().cargar();
});
