/**
 * Base URL de la API de Django.
 *
 * En Docker el frontend estático y la API comparten origen (nginx hace
 * proxy de `/api` → backend), así que el valor por defecto es "" (relativo).
 * En desarrollo se configura con `EXPO_PUBLIC_API_URL`, p. ej.:
 *   EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web
 */
export const API_BASE: string = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
