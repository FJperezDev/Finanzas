/**
 * Persistencia de la sesión (access + refresh tokens) entre recargas.
 *
 *  - Web:     localStorage (síncrono). Riesgo XSS conocido: en producción
 *             conviene pasar a cookies httpOnly servidas por el backend.
 *  - Nativo:  expo-secure-store (Keychain en iOS / Keystore en Android),
 *             cifrado por el sistema operativo, no texto plano.
 *
 * También centraliza la notificación de sesión expirada: cuando el refresco
 * del token falla en una petición, se limpia la sesión y se avisa al store
 * de autenticación para volver al modo invitado (mock).
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface Sesion {
  access: string;
  refresh: string;
  usuario: string;
}

let sesion: Sesion | null = null;
let manejadorExpiracion: (() => void) | null = null;

const CLAVE_WEB = "finanzas.sesion";
const CLAVE_NATIVA = "finanzas.sesion.v1";

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------
function leerPersistidaWeb(): Sesion | null {
  try {
    const crudo = globalThis.localStorage?.getItem(CLAVE_WEB);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

async function escribirPersistidaWeb(s: Sesion | null): Promise<void> {
  try {
    if (s) globalThis.localStorage?.setItem(CLAVE_WEB, JSON.stringify(s));
    else globalThis.localStorage?.removeItem(CLAVE_WEB);
  } catch {
    // Almacenamiento no disponible: la sesión vive solo en memoria.
  }
}

async function leerPersistidaNativa(): Promise<Sesion | null> {
  try {
    const crudo = await SecureStore.getItemAsync(CLAVE_NATIVA);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

async function escribirPersistidaNativa(s: Sesion | null): Promise<void> {
  try {
    if (s) await SecureStore.setItemAsync(CLAVE_NATIVA, JSON.stringify(s));
    else await SecureStore.deleteItemAsync(CLAVE_NATIVA);
  } catch {
    // SecureStore no disponible: la sesión vive solo en memoria.
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export async function cargarSesionPersistida(): Promise<void> {
  sesion =
    Platform.OS === "web" ? leerPersistidaWeb() : await leerPersistidaNativa();
}

export function sesionActual(): Sesion | null {
  return sesion;
}

export function haySesion(): boolean {
  return sesion?.access != null;
}

export async function guardarSesion(nueva: Sesion): Promise<void> {
  sesion = nueva;
  if (Platform.OS === "web") await escribirPersistidaWeb(nueva);
  else await escribirPersistidaNativa(nueva);
}

export async function actualizarTokens(
  access: string,
  refresh: string,
): Promise<void> {
  if (!sesion) return;
  sesion = { ...sesion, access, refresh };
  if (Platform.OS === "web") await escribirPersistidaWeb(sesion);
  else await escribirPersistidaNativa(sesion);
}

export async function limpiarSesion(): Promise<void> {
  sesion = null;
  if (Platform.OS === "web") await escribirPersistidaWeb(null);
  else await escribirPersistidaNativa(null);
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
