import React from "react";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { formStyles } from "./formStyles";
import { colors } from "../../../theme";

export function SelectorPildoras({
  opciones,
  valor,
  onSelect,
}: {
  opciones: string[];
  valor: string;
  onSelect: (v: string) => void;
}) {
  if (!opciones || opciones.length === 0)
    return <Text style={styles.sinOpciones}>Selecciona el campo anterior</Text>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {opciones.map((op) => {
        const activo = op === valor;
        return (
          <Pressable
            key={op}
            onPress={() => onSelect(op)}
            style={[formStyles.chip, activo && formStyles.chipActivo]}
          >
            <Text
              style={[formStyles.chipText, activo && formStyles.chipTextActivo]}
            >
              {op}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sinOpciones: {
    fontSize: 13,
    color: colors.textoMuySuave,
    fontStyle: "italic",
    marginTop: 4,
  },
});
