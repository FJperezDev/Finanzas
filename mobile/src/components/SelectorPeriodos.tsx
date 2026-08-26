/** Selectores de alcance (Mes/Año/Todo) y de periodos para el Dashboard. */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { etiquetaPeriodo, nombreMes } from "../core/formatos";
import { colors } from "../theme";

export type Alcance = "mes" | "anio" | "todo";

const OPCIONES_ALCANCE: {
  clave: Alcance;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
}[] = [
  { clave: "mes", etiqueta: "Mes", icono: "calendar-number-outline" },
  { clave: "anio", etiqueta: "Año", icono: "calendar-outline" },
  { clave: "todo", etiqueta: "Todo", icono: "infinite-outline" },
];

/** Control segmentado Mes / Año / Todo. */
export function SelectorAlcance({
  alcance,
  onCambiar,
}: {
  alcance: Alcance;
  onCambiar: (alcance: Alcance) => void;
}) {
  return (
    <View style={styles.alcanceFondo}>
      {OPCIONES_ALCANCE.map((opcion) => {
        const activo = opcion.clave === alcance;
        return (
          <Pressable
            key={opcion.clave}
            onPress={() => onCambiar(opcion.clave)}
            style={({ pressed }) => [
              styles.alcanceSegmento,
              activo && styles.alcanceSegmentoActivo,
              pressed && !activo && styles.alcanceSegmentoPresionado,
            ]}
            accessibilityLabel={`Alcance: ${opcion.etiqueta}`}
          >
            <Ionicons
              name={opcion.icono}
              size={14}
              color={activo ? colors.textoInvertido : colors.textoSuave}
            />
            <Text
              style={[
                styles.alcanceTexto,
                activo && styles.alcanceTextoActivo,
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fila de chips genérica (meses o años)
// ---------------------------------------------------------------------------
function FilaChips({
  opciones,
  seleccionado,
  onSeleccionar,
}: {
  opciones: { clave: string; texto: string; sub?: string }[];
  seleccionado: string | null;
  onSeleccionar: (clave: string) => void;
}) {
  if (opciones.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.fila}
      contentContainerStyle={styles.contenido}
    >
      {opciones.map((opcion) => {
        const activo = opcion.clave === seleccionado;
        return (
          <Pressable
            key={opcion.clave}
            onPress={() => onSeleccionar(opcion.clave)}
            style={[styles.chip, activo && styles.chipActivo]}
          >
            <Text style={[styles.texto, activo && styles.textoActivo]}>
              {opcion.texto}
            </Text>
            {opcion.sub ? (
              <Text style={[styles.sub, activo && styles.subActivo]}>
                {opcion.sub}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Chips de meses ("YYYY-MM"). */
export function SelectorPeriodos({
  periodos,
  seleccionado,
  onSeleccionar,
}: {
  periodos: string[]; // "YYYY-MM"
  seleccionado: string | null;
  onSeleccionar: (periodo: string) => void;
}) {
  return (
    <FilaChips
      opciones={periodos.map((p) => ({
        clave: p,
        texto: nombreMes(Number(p.slice(5, 7))),
        sub: etiquetaPeriodo(Number(p.slice(0, 4)), Number(p.slice(5, 7))),
      }))}
      seleccionado={seleccionado}
      onSeleccionar={onSeleccionar}
    />
  );
}

/** Chips de años. */
export function SelectorAnios({
  anios,
  seleccionado,
  onSeleccionar,
}: {
  anios: number[];
  seleccionado: number | null;
  onSeleccionar: (anio: number) => void;
}) {
  return (
    <FilaChips
      opciones={anios.map((a) => ({ clave: String(a), texto: String(a) }))}
      seleccionado={seleccionado == null ? null : String(seleccionado)}
      onSeleccionar={(clave) => onSeleccionar(Number(clave))}
    />
  );
}

const styles = StyleSheet.create({
  // --- SEGMENTADO MES / AÑO / TODO ---
  alcanceFondo: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    backgroundColor: colors.surface0,
  },
  alcanceSegmento: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  alcanceSegmentoActivo: {
    backgroundColor: colors.primario,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  alcanceSegmentoPresionado: { backgroundColor: colors.surface1 },
  alcanceTexto: { fontSize: 13, fontWeight: "700", color: colors.textoSuave },
  alcanceTextoActivo: { color: colors.textoInvertido },

  // --- CHIPS DE MES / AÑO ---
  fila: { flexGrow: 0, marginBottom: 10 },
  contenido: { gap: 8, paddingRight: 4 },
  chip: {
    minWidth: 74,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    backgroundColor: colors.tarjeta,
  },
  chipActivo: {
    backgroundColor: colors.primario,
    borderColor: colors.primario,
  },
  texto: { fontSize: 13, fontWeight: "700", color: colors.texto },
  textoActivo: { color: colors.textoInvertido },
  sub: { fontSize: 10, color: colors.textoMuySuave },
  subActivo: { color: colors.textoInvertido, opacity: 0.8 },
});
