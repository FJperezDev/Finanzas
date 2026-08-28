import React from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fmtEur, fmtPct } from "../../core/formatos";
import { colors } from "../../theme";

export function TarjetaPilar({
  titulo,
  subtitulo,
  aportado,
  valorActual,
  icono,
  colorAcento,
}: {
  titulo: string;
  subtitulo: string;
  aportado: number;
  valorActual: number;
  icono: keyof typeof Ionicons.glyphMap;
  colorAcento: string;
}) {
  const variacion = aportado > 0 ? (valorActual - aportado) / aportado : 0;
  const esPositivo = variacion >= 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pilar,
        { borderTopColor: colorAcento, borderTopWidth: 3 },
        pressed && {
          transform: [{ translateY: -2 }],
          backgroundColor: colors.tarjeta,
        },
      ]}
      onPress={() => console.log(`Filtrar por pilar: ${titulo}`)}
    >
      <View style={styles.pilarCabecera}>
        <View
          style={[
            styles.pilarIconoBox,
            { backgroundColor: colorAcento + "15" },
          ]}
        >
          <Ionicons name={icono} size={22} color={colorAcento} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pilarTitulo}>{titulo}</Text>
          <Text style={styles.pilarSubtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>
      </View>

      <View style={styles.pilarCuerpo}>
        <Text style={styles.pilarValor}>{fmtEur(valorActual)}</Text>
        <View style={styles.pilarFooter}>
          {valorActual !== aportado && (
            <Text style={styles.pilarAportado}>Base: {fmtEur(aportado)}</Text>
          )}
          {variacion !== 0 && (
            <View
              style={[
                styles.badgeVariacion,
                esPositivo ? styles.badgePositivo : styles.badgeNegativo,
              ]}
            >
              <Ionicons
                name={esPositivo ? "trending-up" : "trending-down"}
                size={12}
                color={esPositivo ? colors.exito : colors.peligro}
              />
              <Text
                style={[
                  styles.textoVariacion,
                  esPositivo ? styles.textoPositivo : styles.textoNegativo,
                ]}
              >
                {fmtPct(variacion)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pilar: {
    flex: 1,
    backgroundColor: colors.surface0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pilarCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  pilarIconoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pilarTitulo: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.texto,
  },
  pilarSubtitulo: {
    fontSize: 12,
    color: colors.textoSuave,
    marginTop: 2,
  },
  pilarCuerpo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pilarValor: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.texto,
    fontVariant: ["tabular-nums"],
    marginBottom: 8,
  },
  pilarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 12,
  },
  pilarAportado: {
    fontSize: 12,
    color: colors.textoMuySuave,
    fontWeight: "600",
  },
  badgeVariacion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgePositivo: { backgroundColor: colors.exitoSuave },
  badgeNegativo: { backgroundColor: colors.peligroSuave },
  textoVariacion: { fontSize: 11, fontWeight: "800" },
  textoPositivo: { color: colors.exito },
  textoNegativo: { color: colors.peligro },
});
