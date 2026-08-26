/**
 * Llamadas HTTP de autenticación y transporte autenticado.
 *
 * `peticionAutenticada` adjunta el access token y, si el servidor responde
 * 401, intenta refrescarlo una única vez (single-flight) y reintenta. Si el
 * refresco falla, la sesión se da por expirada: se limpia y se notifica al
 * store de auth para volver al modo invitado con datos mock.
 */
import { API_BASE } from "./apiBase";
import {
  actualizarTokens,
  haySesion,
  notificarSesionExpirada,
  sesionActual,
} from "./tokenStore";

export interface RespuestaLogueo {
  access: string;
  refresh: string;
  usuario: string;
}

async function parsearError(respuesta: Response): Promise<Error> {
  const datos = (await respuesta.json().catch(() => ({}))) as {
    errores?: string[];
  };
  return new Error(
    datos.errores?.join(" ") || `Error del servidor (HTTP ${respuesta.status}).`,
  );
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<RespuestaLogueo> {
  const respuesta = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!respuesta.ok) throw await parsearError(respuesta);
  return (await respuesta.json()) as RespuestaLogueo;
}

export async function apiRefresh(refreshToken: string): Promise<RespuestaLogueo> {
  const respuesta = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!respuesta.ok) throw await parsearError(respuesta);
  return (await respuesta.json()) as RespuestaLogueo;
}

export async function apiLogout(): Promise<void> {
  const s = sesionActual();
  if (!s?.refresh) return;
  try {
    await fetch(`${API_BASE}/api/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: s.refresh }),
    });
  } catch {
    // Best-effort: si el servidor no responde, la sesión local se limpia igual.
  }
}

// ---------------------------------------------------------------------------
// Refresco single-flight
// ---------------------------------------------------------------------------
let refrescoEnCurso: Promise<boolean> | null = null;

function refrescarUnaVez(): Promise<boolean> {
  if (!refrescoEnCurso) {
    refrescoEnCurso = (async () => {
      const s = sesionActual();
      if (!s?.refresh) return false;
      try {
        const par = await apiRefresh(s.refresh);
        await actualizarTokens(par.access, par.refresh);
        return true;
      } catch {
        await notificarSesionExpirada();
        return false;
      } finally {
        refrescoEnCurso = null;
      }
    })();
  }
  return refrescoEnCurso;
}

// ---------------------------------------------------------------------------
// Fetch autenticado
// ---------------------------------------------------------------------------
export async function peticionAutenticada(
  ruta: string,
  init?: RequestInit,
): Promise<Response> {
  if (!haySesion()) {
    throw new Error("No hay sesión activa: inicia sesión para usar el backend.");
  }

  const hacer = () =>
    fetch(`${API_BASE}/api/${ruta}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${sesionActual()?.access ?? ""}`,
      },
    });

  let respuesta = await hacer();
  if (respuesta.status === 401) {
    if (await refrescarUnaVez()) {
      respuesta = await hacer();
    } else {
      throw new Error("La sesión ha caducado. Vuelve a iniciar sesión.");
    }
  }
  return respuesta;
}
