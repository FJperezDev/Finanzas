import React from "react";
import {
  Text,
  View,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fmtEur, fmtPct } from "../../core/formatos";
import { colors } from "../../theme";

export interface CuentaResumen {
  id: number;
  nombre: string;
  balance: number;
}

export function TarjetaPilar({
  titulo,
  subtitulo,
  aportado,
  valorActual,
  icono,
  colorAcento,
  cuentas,
  onAgregarCuenta,
  onCuentaPress,
}: {
  titulo: string;
  subtitulo: string;
  aportado: number;
  valorActual: number;
  icono: keyof typeof Ionicons.glyphMap;
  colorAcento: string;
  cuentas?: CuentaResumen[];
  onAgregarCuenta?: () => void;
  onCuentaPress?: (id: number) => void;
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
          backgroundColor: colors.tarjeta, // Asegúrate de tener este color en tu theme o usa una alternativa
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
        <View style={styles.textosCabecera}>
          <Text style={styles.pilarTitulo}>{titulo}</Text>
          <Text style={styles.pilarSubtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>
        {onAgregarCuenta && (
          <Pressable
            onPress={onAgregarCuenta}
            hitSlop={15}
            style={styles.btnAgregar}
          >
            <Ionicons name="add-circle" size={26} color={colorAcento} />
          </Pressable>
        )}
      </View>

      <View style={styles.pilarCuerpo}>
        <Text style={styles.pilarValor}>{fmtEur(valorActual)}</Text>

        {cuentas && cuentas.length > 0 && (
          <View style={styles.listaCuentas}>
            {cuentas.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.cuentaCard}
                activeOpacity={0.7}
                onPress={() => onCuentaPress?.(c.id)}
              >
                <Text style={styles.cuentaNombre} numberOfLines={1}>
                  {c.nombre}
                </Text>
                <View style={styles.cuentaDerecha}>
                  <Text style={styles.cuentaBalance}>{fmtEur(c.balance)}</Text>
                  {onCuentaPress && (
                    <Ionicons
                      name="swap-horizontal"
                      size={14}
                      color={colors.textoMuySuave}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
    flex: 1, // RESTAURADO: En PC (row) hará que midan 33% cada una. En móvil (column) fluirán normal.
    backgroundColor: colors.surface0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pilarCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  btnAgregar: {
    padding: 4,
    borderRadius: 12,
  },
  pilarIconoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textosCabecera: {
    flex: 1,
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
    marginTop: 4,
  },
  pilarValor: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.texto,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  listaCuentas: {
    gap: 8,
    marginBottom: 16,
  },
  cuentaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cuentaNombre: {
    fontSize: 14,
    color: colors.textoSuave,
    fontWeight: "600",
    flexShrink: 1,
    marginRight: 8,
  },
  cuentaDerecha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cuentaBalance: {
    fontSize: 14,
    color: colors.texto,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pilarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 16,
  },
  pilarAportado: {
    fontSize: 12,
    color: colors.textoMuySuave,
    fontWeight: "600",
  },
  badgeVariacion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgePositivo: { backgroundColor: colors.exito + "15" },
  badgeNegativo: { backgroundColor: colors.peligro + "15" },
  textoVariacion: { fontSize: 12, fontWeight: "800" },
  textoPositivo: { color: colors.exito },
  textoNegativo: { color: colors.peligro },
});
