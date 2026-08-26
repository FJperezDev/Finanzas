import React from "react";
import { View, Text } from "react-native";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryTooltip,
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
const FLYOUT_STYLE = {
  fill: colors.surface0,
  stroke: colors.bordeFuerte,
  strokeWidth: 1,
};

// Reutilizamos el concepto de tu leyenda pero con componentes nativos
function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginRight: 12,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: 11, color: colors.textoSuave }}>{texto}</Text>
    </View>
  );
}

export function BarrasComparativa({
  datos,
  alto = 260,
}: {
  datos: { etiqueta: string; real: number; objetivo: number }[];
  alto?: number;
}) {
  return (
    <View style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}>
      <VictoryChart height={alto} domainPadding={{ x: 28 }}>
        <VictoryAxis
          tickFormat={(t: string) => String(t).replace("_", " ")}
          style={EJES}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(t: number) => `${t}%`}
          style={EJES_Y}
        />

        <VictoryGroup offset={14}>
          <VictoryBar
            data={datos.map((d) => ({
              x: d.etiqueta,
              y: Math.round(d.real * 1000) / 10,
              label: `Real: ${fmtPct(d.real)}`,
            }))}
            style={{ data: { fill: colors.primario, width: 14 } }}
            animate={{ duration: 800, onLoad: { duration: 800 } }}
            labelComponent={
              <VictoryTooltip
                style={TOOLTIP_STYLE}
                flyoutStyle={FLYOUT_STYLE}
              />
            }
          />
          <VictoryBar
            data={datos.map((d) => ({
              x: d.etiqueta,
              y: Math.round(d.objetivo * 1000) / 10,
              label: `Obj: ${fmtPct(d.objetivo)}`,
            }))}
            style={{ data: { fill: colors.surface2, width: 14 } }}
            animate={{ duration: 800, onLoad: { duration: 800 } }}
            labelComponent={
              <VictoryTooltip
                style={TOOLTIP_STYLE}
                flyoutStyle={FLYOUT_STYLE}
              />
            }
          />
        </VictoryGroup>
      </VictoryChart>

      {/* Añadimos la leyenda faltante */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: -10,
        }}
      >
        <Leyenda color={colors.primario} texto="Distribución Real" />
        <Leyenda color={colors.surface2} texto="Objetivo 50/30/20" />
      </View>
    </View>
  );
}
