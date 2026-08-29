import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { colors, sombra } from "../theme";

// ---------------------------------------------------------------------------
// 1. COMPONENTES REDISEÑADOS (PREMIUM)
// ---------------------------------------------------------------------------
export function Tarjeta({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.tarjeta, style]}>{children}</View>;
}

export function TituloSeccion({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.tituloSeccion, style]}>{children}</Text>;
}

export function Subtitulo({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitulo}>{children}</Text>;
}

export function Metrica({
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "normal" | "exito" | "peligro" | "aviso";
}) {
  const colorValor =
    tono === "exito"
      ? colors.exito
      : tono === "peligro"
        ? colors.peligro
        : tono === "aviso"
          ? colors.aviso
          : colors.texto;
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaEtiqueta}>{etiqueta}</Text>
      <Text
        style={[styles.metricaValor, { color: colorValor }]}
        numberOfLines={1}
      >
        {valor}
      </Text>
      {detalle ? <Text style={styles.metricaDetalle}>{detalle}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2. COMPONENTES EXISTENTES RESTAURADOS
// ---------------------------------------------------------------------------
export function FilaMetricas({ ninos }: { ninos: React.ReactNode[] }) {
  return (
    <View style={styles.filaMetricas}>
      {ninos.map((nino, i) => (
        <View
          key={i}
          style={[styles.celdaMetrica, { marginLeft: i === 0 ? 0 : 8 }]}
        >
          {nino}
        </View>
      ))}
    </View>
  );
}

export function Banner({
  tono,
  texto,
  icono,
}: {
  tono: "exito" | "aviso" | "peligro" | "info";
  texto: string;
  icono?: keyof typeof Ionicons.glyphMap;
}) {
  const config = {
    exito: {
      fondo: colors.exitoSuave,
      borde: colors.exito,
      icon: icono ?? "checkmark-circle",
    },
    aviso: {
      fondo: colors.avisoSuave,
      borde: colors.aviso,
      icon: icono ?? "warning",
    },
    peligro: {
      fondo: colors.peligroSuave,
      borde: colors.peligro,
      icon: icono ?? "alert-circle",
    },
    info: {
      fondo: colors.primarioSuave,
      borde: colors.primario,
      icon: icono ?? "information-circle",
    },
  } as const;
  const c = config[tono];
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: c.fondo, borderColor: c.borde },
      ]}
    >
      <Ionicons
        name={c.icon}
        size={18}
        color={c.borde}
        style={styles.bannerIcono}
      />
      <Text style={[styles.bannerTexto, { color: c.borde }]}>{texto}</Text>
    </View>
  );
}

export function BarraProgreso({
  ratio,
  texto,
}: {
  ratio: number;
  texto?: string;
}) {
  const pct = Math.min(Math.max(ratio, 0), 1) * 100;
  const color = ratio > 1 ? colors.peligro : colors.primario;
  return (
    <View>
      <View style={styles.progresoFondo}>
        <View
          style={[
            styles.progresoRelleno,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      {texto ? <Text style={styles.progresoTexto}>{texto}</Text> : null}
    </View>
  );
}

export function EtiquetaCampo({ children }: { children: React.ReactNode }) {
  return <Text style={styles.etiquetaCampo}>{children}</Text>;
}

export function Boton({
  etiqueta,
  icono,
  onPress,
  variante = "primario",
  deshabilitado,
  compacto,
  estilo,
}: {
  etiqueta: string;
  icono?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  deshabilitado?: boolean;
  compacto?: boolean;
  estilo?: ViewStyle;
}) {
  const esPrimario = variante === "primario";
  const esPeligro = variante === "peligro";
  const esSecundario = variante === "secundario";

  const fondo = esPrimario
    ? colors.primario
    : esPeligro
      ? colors.peligro
      : esSecundario
        ? colors.tarjeta
        : "transparent";
  const colorTexto =
    esSecundario || variante === "fantasma" ? colors.texto : "#ffffff";
  const borde = esSecundario ? colors.borde : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitado}
      activeOpacity={0.7}
      style={[
        styles.boton,
        {
          backgroundColor: fondo,
          borderColor: borde,
          borderWidth: esSecundario ? 1 : 0,
        },
        compacto && styles.botonCompacto,
        (esPrimario || esPeligro) && styles.botonSombra,
        deshabilitado && { opacity: 0.5 },
        estilo,
      ]}
    >
      {icono ? (
        <Ionicons name={icono} size={compacto ? 16 : 18} color={colorTexto} />
      ) : null}
      <Text
        style={[
          styles.botonTexto,
          { color: colorTexto },
          compacto && styles.botonTextoCompacto,
        ]}
        numberOfLines={1}
      >
        {etiqueta}
      </Text>
    </TouchableOpacity>
  );
}

export function ModalCentro({
  visible,
  titulo,
  onCerrar,
  children,
}: {
  visible: boolean;
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.modalCentroFondo}>
        <View style={styles.modalCentroTarjeta}>
          <View style={styles.modalCentroCabecera}>
            <Text style={styles.modalCentroTitulo}>{titulo}</Text>
            <TouchableOpacity
              onPress={onCerrar}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.botonCerrar}
            >
              <Ionicons name="close" size={20} color={colors.textoSuave} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 3. ESTILOS COMBINADOS
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // --- NUEVOS ESTILOS TARJETAS Y MÉTRICAS ---
  tarjeta: {
    backgroundColor: colors.surface0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tituloSeccion: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.texto,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitulo: {
    fontSize: 13,
    color: colors.textoSuave,
    lineHeight: 18,
    marginBottom: 8,
  },
  metrica: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  metricaEtiqueta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricaValor: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  metricaDetalle: { fontSize: 12, color: colors.textoMuySuave, marginTop: 4 },

  // --- ESTILOS RESTAURADOS DE COMPONENTES ---
  filaMetricas: { flexDirection: "row", marginHorizontal: -4 },
  celdaMetrica: {
    flex: 1,
    backgroundColor: colors.tarjeta,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borde,
    ...sombra.tarjeta,
  },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  bannerIcono: { marginRight: 8, marginTop: 1 },
  bannerTexto: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },

  progresoFondo: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borde,
    overflow: "hidden",
  },
  progresoRelleno: { height: "100%", borderRadius: 5 },
  progresoTexto: { fontSize: 11, color: colors.textoSuave, marginTop: 4 },

  etiquetaCampo: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textoSuave,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  botonSombra: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  botonCompacto: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  botonTexto: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  botonTextoCompacto: { fontSize: 13 },

  modalCentroFondo: {
    flex: 1,
    backgroundColor: "rgba(15,26,46,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCentroTarjeta: {
    backgroundColor: colors.tarjeta,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 450,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  modalCentroCabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalCentroTitulo: { fontSize: 18, fontWeight: "800", color: colors.texto },
  botonCerrar: { backgroundColor: colors.fondo, padding: 6, borderRadius: 20 },
});
