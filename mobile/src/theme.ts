import { Platform } from "react-native";

export const colors = {
  // ============================================================
  // FONDOS — Escala Zinc (mapeado de tailwind.config.js)
  // ============================================================
  fondo: "#09090b", // root
  surface0: "#18181b", // surface.0
  surface1: "#27272a", // surface.1
  surface2: "#3f3f46", // surface.2
  surfaceHover: "#52525b", // surface.hover

  // Simulando el .card de global.css (bg-white/[0.03] sobre fondo oscuro)
  // Usamos surface0 y surface1 para mantener coherencia en móvil sin abusar de opacidades
  tarjeta: "#18181b",
  tarjetaElevada: "#27272a",

  // ============================================================
  // TEXTO — Mapeado de text.*
  // ============================================================
  texto: "#fafafa", // text.primary
  textoSuave: "#a1a1aa", // text.secondary
  textoMuySuave: "#71717a", // text.muted
  textoInvertido: "#09090b", // root (para contrastar sobre el color accent)

  // ============================================================
  // ACCENT — IDENTIDAD VISUAL (Ámbar)
  // ============================================================
  primario: "#fbbf24", // accent.DEFAULT
  primarioFuerte: "#f59e0b", // accent.strong
  primarioSuave: "#fde68a", // accent.soft

  primarioFondo: "rgba(251, 191, 36, 0.10)",
  primarioBorde: "rgba(251, 191, 36, 0.30)", // border.accent

  // ============================================================
  // BORDES
  // ============================================================
  borde: "#27272a", // border.DEFAULT
  bordeFuerte: "#3f3f46", // border.light
  bordeSuave: "rgba(255, 255, 255, 0.08)", // Igual al borde de .card en global.css

  // ============================================================
  // ESTADOS — Tonos estándar de Tailwind que combinan con Zinc
  // ============================================================
  exito: "#34d399",
  exitoSuave: "rgba(52, 211, 153, 0.12)",

  aviso: "#fbbf24",
  avisoSuave: "rgba(251, 191, 36, 0.12)",

  peligro: "#f87171",
  peligroSuave: "rgba(248, 113, 113, 0.12)",

  info: "#38bdf8",
  infoSuave: "rgba(56, 189, 248, 0.12)",

  // ============================================================
  // GRID — Ajustado a la paleta Zinc
  // ============================================================
  gridFondo: "#09090b", // root
  gridCabecera: "#18181b", // surface.0
  gridCabeceraActiva: "#27272a", // surface.1
  gridLinea: "#27272a", // border.DEFAULT
  gridFilaAlterna: "#0f0f12", // Un tono intermedio entre root y surface0
  gridFilaHover: "#18181b", // surface.0

  gridSeleccion: "rgba(251, 191, 36, 0.16)",
  gridSeleccionBorde: "#fbbf24",

  gridCeldaEditando: "#27272a", // surface.1
  gridCeldaError: "rgba(248, 113, 113, 0.10)",

  // Compatibilidad con posibles componentes existentes
  excelVerde: "#217346",
} as const;

export const sombra = {
  // Sombras oscuras clásicas (el negro funciona perfecto sobre Zinc)
  tarjeta: {
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 6,
  },

  flotante: {
    // Si quieres simular un poco el shadow-accent/5 del hover de la web,
    // podrías cambiar este shadowColor a "#fbbf24", pero en móvil
    // suele ser más seguro mantenerlo en negro para evitar halos extraños.
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 12,
  },
} as const;

export const layout = {
  radioSm: 8,
  radioMd: 12,
  radioLg: 16,
  radioXl: 24,

  espacioXs: 4,
  espacioSm: 8,
  espacioMd: 12,
  espacioLg: 16,
  espacioXl: 24,
} as const;

export const typography = {
  fuente: Platform.select({
    web: '"Inter", system-ui, -apple-system, sans-serif',
    default: undefined, // En móvil usará la fuente del sistema por defecto a menos que enlaces "Inter"
  }),

  mono: Platform.select({
    web: '"JetBrains Mono", "Fira Code", monospace',
    default: undefined,
  }),
} as const;
