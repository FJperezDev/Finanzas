import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { VictoryPie, VictoryTooltip } from "victory";

import { fmtPct, fmtEur } from "../../core/formatos";
import { colors } from "../../theme";

const PALETA = [
  colors.primario,
  colors.exito,
  colors.info,
  colors.aviso,
  colors.peligro,
  colors.surface2,
  colors.textoSuave,
];

const TOOLTIP_STYLE = { fill: colors.texto, fontSize: 11, fontWeight: "bold" };
const FLYOUT_STYLE = {
  fill: colors.surface0,
  stroke: colors.bordeFuerte,
  strokeWidth: 1,
};

export function DonutDistribucion({
  datos,
  alto = 260,
}: {
  datos: { etiqueta: string; valor: number; peso: number }[];
  alto?: number;
}) {
  const total = datos.reduce((acc, d) => acc + d.valor, 0);

  return (
    <View style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}>
      <View style={{ position: "relative", alignItems: "center" }}>
        <VictoryPie
          data={datos.map((d) => ({
            x: d.etiqueta,
            y: d.valor,
            label: `${d.etiqueta.replace("_", " ")}\n${fmtPct(d.peso)} (${fmtEur(d.valor)})`,
          }))}
          height={alto}
          innerRadius={75}
          padAngle={2}
          cornerRadius={4}
          colorScale={PALETA}
          animate={{ duration: 1000, onLoad: { duration: 1000 } }}
          labelComponent={
            <VictoryTooltip
              style={TOOLTIP_STYLE}
              flyoutStyle={FLYOUT_STYLE}
              constrainToVisibleArea
            />
          }
          style={{
            data: {
              stroke: colors.fondo,
              strokeWidth: 2,
              cursor: "pointer", // Esto solo funciona en web, está ok mantenerlo
            },
          }}
        />
        {/* Contenido Central Absoluto */}
        <View style={StyleSheet.absoluteFillObject}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: "800", color: colors.texto }}
            >
              {fmtEur(total)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textoSuave }}>
              Gasto Total
            </Text>
          </View>
        </View>
      </View>

      {/* Leyenda Personalizada migrada a Native */}
      <View style={{ marginTop: 10, paddingHorizontal: 16 }}>
        {datos.map((d, i) => (
          <View
            key={d.etiqueta}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: PALETA[i % PALETA.length],
              }}
            />
            <Text
              style={{ flex: 1, fontSize: 12, color: colors.textoSuave }}
              numberOfLines={1}
            >
              {d.etiqueta.replace("_", " ")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.texto,
                fontVariant: ["tabular-nums"],
              }}
            >
              {fmtPct(d.peso)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
