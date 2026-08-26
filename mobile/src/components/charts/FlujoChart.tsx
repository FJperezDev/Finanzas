import React from "react";
import { View, Text } from "react-native";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryTooltip,
  VictoryGroup,
} from "victory";
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

function Leyenda({
  color,
  texto,
  linea,
}: {
  color: string;
  texto: string;
  linea?: boolean;
}) {
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
          width: linea ? 14 : 10,
          height: linea ? 3 : 10,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: 11, color: colors.textoSuave }}>{texto}</Text>
    </View>
  );
}

export function FlujoChart({
  datos,
  alto = 300,
  destacada = null,
}: {
  datos: { etiqueta: string; ingresos: number; gastos: number; neto: number }[];
  alto?: number;
  destacada?: string | null;
}) {
  if (datos.length === 0) {
    return (
      <View
        style={{ height: alto, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 12, color: colors.textoMuySuave }}>
          Sin datos suficientes.
        </Text>
      </View>
    );
  }

  // Atenúa los meses fuera del periodo destacado para dar contexto visual.
  const opacidadDe = (args: { datum?: { x?: string } }) =>
    destacada != null && args.datum?.x !== destacada ? 0.28 : 1;

  return (
    <View style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}>
      <VictoryChart height={alto} domainPadding={{ x: 25 }}>
        <VictoryAxis style={EJES} />
        <VictoryAxis
          dependentAxis
          tickFormat={(t: number) => `${Math.round(t / 1000)}k`}
          style={EJES_Y}
        />

        <VictoryGroup offset={10}>
          <VictoryBar
            data={datos.map((d) => ({
              x: d.etiqueta,
              y: Math.round(d.ingresos),
              label: `Ingresos: ${Math.round(d.ingresos)}€`,
            }))}
            style={{ data: { fill: colors.exito, width: 10, opacity: opacidadDe } }}
            animate={{ duration: 600, onLoad: { duration: 600 } }}
            labelComponent={
              <VictoryTooltip
                style={TOOLTIP_STYLE}
                flyoutStyle={FLYOUT_STYLE}
                constrainToVisibleArea
              />
            }
          />
          <VictoryBar
            data={datos.map((d) => ({
              x: d.etiqueta,
              y: -Math.round(d.gastos), // Se representa en negativo
              label: `Gastos: ${Math.round(d.gastos)}€`, // Pero el tooltip muestra el valor bruto positivo para mejor lectura
            }))}
            style={{ data: { fill: colors.peligro, width: 10, opacity: opacidadDe } }}
            animate={{ duration: 600, onLoad: { duration: 600 } }}
            labelComponent={
              <VictoryTooltip
                style={TOOLTIP_STYLE}
                flyoutStyle={FLYOUT_STYLE}
                constrainToVisibleArea
              />
            }
          />
        </VictoryGroup>

        <VictoryLine
          data={datos.map((d) => ({
            x: d.etiqueta,
            y: Math.round(d.neto),
            label: `Neto: ${Math.round(d.neto)}€`,
          }))}
          style={{ data: { stroke: colors.primario, strokeWidth: 3 } }}
          animate={{ duration: 1000, onLoad: { duration: 1000 } }}
          labelComponent={
            <VictoryTooltip
              style={TOOLTIP_STYLE}
              flyoutStyle={{ ...FLYOUT_STYLE, stroke: colors.primario }}
              constrainToVisibleArea
            />
          }
        />
      </VictoryChart>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: -10,
        }}
      >
        <Leyenda color={colors.exito} texto="Ingresos" />
        <Leyenda color={colors.peligro} texto="Gastos" />
        <Leyenda color={colors.primario} texto="Flujo neto" linea />
      </View>
    </View>
  );
}
