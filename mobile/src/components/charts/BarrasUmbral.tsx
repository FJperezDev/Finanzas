import React from "react";
import { View } from "react-native";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryTooltip,
  VictoryLabel,
} from "victory";
import { fmtPct } from "../../core/formatos";
import { colors } from "../../theme";

const EJES = {
  axis: { stroke: colors.bordeFuerte },
  tickLabels: { fontSize: 9, fill: colors.textoSuave },
  grid: { stroke: "transparent" },
};
const EJES_Y = {
  axis: { stroke: colors.bordeFuerte },
  tickLabels: { fontSize: 9, fill: colors.textoSuave },
  grid: { stroke: colors.borde, strokeDasharray: "3,4" },
};
const TOOLTIP_STYLE = { fill: colors.texto, fontSize: 10, fontWeight: "bold" };

export function BarrasUmbral({
  datos,
  umbralPct,
  alto = 260,
}: {
  datos: { etiqueta: string; pct: number }[];
  umbralPct: number;
  alto?: number;
}) {
  const maximo = Math.max(umbralPct * 1.3, ...datos.map((d) => d.pct), 10);

  return (
    <View style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}>
      <VictoryChart
        height={alto}
        domainPadding={{ x: 20 }}
        domain={{ y: [0, maximo] }}
      >
        <VictoryAxis style={EJES} />
        <VictoryAxis
          dependentAxis
          tickFormat={(t: number) => `${t}%`}
          style={EJES_Y}
        />

        <VictoryBar
          data={datos.map((d) => ({
            x: d.etiqueta,
            y: Math.round(d.pct * 10) / 10,
            label: `${fmtPct(d.pct / 100)}`,
          }))}
          style={{
            data: {
              fill: (args: { datum?: { y?: number } }) =>
                (args.datum?.y ?? 0) > umbralPct
                  ? colors.peligro
                  : colors.exito,
              width: 16,
            },
          }}
          animate={{ duration: 800, onLoad: { duration: 800 } }}
          labelComponent={
            <VictoryTooltip
              style={TOOLTIP_STYLE}
              flyoutStyle={{
                fill: colors.surface0,
                stroke: colors.bordeFuerte,
              }}
            />
          }
        />

        {/* Línea de umbral animada con Etiqueta */}
        <VictoryLine
          data={datos.map((d) => ({ x: d.etiqueta, y: umbralPct }))}
          style={{
            data: {
              stroke: colors.peligro,
              strokeDasharray: "6,5",
              strokeWidth: 2,
            },
          }}
          animate={{ duration: 1000, onLoad: { duration: 1000 } }}
          labels={["Límite Recomendado"]}
          labelComponent={
            <VictoryLabel
              dy={-10}
              dx={5}
              style={{ fill: colors.peligro, fontSize: 9, fontWeight: "600" }}
            />
          }
        />
      </VictoryChart>
    </View>
  );
}
