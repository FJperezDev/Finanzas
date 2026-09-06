import { StyleSheet } from "react-native";
import { colors } from "../../../theme";

export const MAPA_CATEGORIAS: Record<string, string[]> = {
  Ingreso: ["Nómina", "Regalo", "Deuda"],
  Gasto: ["Ocio", "Inversión", "Fijo"],
};

export const MAPA_SUBCATEGORIAS: Record<string, string[]> = {
  Nómina: ["Nómina Principal", "Ingreso Secundario"],
  Regalo: ["Regalo"],
  Deuda: ["Ocio", "Alquiler", "Comida", "Wifi", "Gastos"],
  Ocio: ["Ocio", "Restaurantes", "Viajes"],
  Inversión: ["Cartera de Inversión", "Cuenta Remunerada", "Marca Personal"],
  Fijo: ["Alquiler", "Comida", "Gimnasio", "Ropa", "Wifi", "Gastos"],
};

export const inputDateStyles: any = {
  backgroundColor: colors.fondo,
  border: `1px solid ${colors.bordeFuerte}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: colors.texto,
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const formStyles = StyleSheet.create({
  formContainerWrapper: {
    flexShrink: 1,
    display: "flex",
    flexDirection: "column",
  },
  formScrollView: {
    flexShrink: 1,
    marginBottom: 16,
  },
  footerAccion: {
    marginTop: "auto",
  },
  formGrid: { gap: 14, paddingBottom: 8 },
  formRow: { flexDirection: "row", gap: 12 },
  formCol: { flex: 1, gap: 6 },
  formColUnico: { gap: 6 },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.texto,
  },
  separador: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 4,
  },
  chip: {
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActivo: {
    backgroundColor: colors.primario,
    borderColor: colors.primario,
  },
  chipText: { fontSize: 13, color: colors.texto, fontWeight: "500" },
  chipTextActivo: { color: "#ffffff", fontWeight: "700" },
  notaTraspaso: {
    fontSize: 12,
    color: colors.textoSuave,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
});
