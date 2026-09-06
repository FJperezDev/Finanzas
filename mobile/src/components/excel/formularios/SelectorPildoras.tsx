import React, { useRef } from "react";
import {
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  View,
} from "react-native";
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
  const scrollRef = useRef<ScrollView>(null);

  if (!opciones || opciones.length === 0)
    return <Text style={styles.sinOpciones}>Selecciona el campo anterior</Text>;

  // Función exclusiva para Web: Traduce la rueda vertical del ratón a scroll horizontal
  const handleWheel =
    Platform.OS === "web"
      ? (e: any) => {
          if (scrollRef.current && e.deltaY !== 0) {
            const node = scrollRef.current.getScrollableNode();
            if (node) {
              // Multiplicamos por un factor para ajustar la velocidad del scroll
              node.scrollLeft += e.deltaY * 0.5;
            }
          }
        }
      : undefined;

  return (
    <View
      style={styles.contenedor}
      // Pasamos el evento onWheel solo si estamos en entorno web
      {...(Platform.OS === "web" ? { onWheel: handleWheel } : {})}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        // Muestra la barra de scroll en PC para dar pistas visuales; la oculta en móvil
        showsHorizontalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={styles.scrollContent}
        // Mejoras de inercia y fricción para pantallas táctiles
        decelerationRate="fast"
        overScrollMode="always"
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
                style={[
                  formStyles.chipText,
                  activo && formStyles.chipTextActivo,
                ]}
              >
                {op}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: "100%",
  },
  scrollContent: {
    gap: 8,
    // Añadimos padding inferior en web para que la barra de scroll no pise las píldoras
    paddingBottom: Platform.OS === "web" ? 10 : 4,
    paddingHorizontal: 2,
  },
  sinOpciones: {
    fontSize: 13,
    color: colors.textoMuySuave,
    fontStyle: "italic",
    marginTop: 4,
  },
});
