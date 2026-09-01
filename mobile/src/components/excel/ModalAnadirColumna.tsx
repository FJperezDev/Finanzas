import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModalCentro, Boton } from "../ui";
import { useEditorStore } from "../../state/editorStore";
import { colors } from "../../theme";

export function ModalAnadirColumna({
  visible,
  onCerrar,
}: {
  visible: boolean;
  onCerrar: () => void;
}) {
  const columnasExtra = useEditorStore((s: any) => s.columnasExtra);
  const agregarColumna = useEditorStore((s: any) => s.agregarColumna);
  const eliminarColumna = useEditorStore((s: any) => s.eliminarColumna);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const procesarAñadir = () => {
    if (nombre.trim().length > 0) {
      const res = agregarColumna(nombre);
      if (res) setError(res);
      else {
        setNombre("");
        setError(null);
      }
    }
  };

  return (
    <ModalCentro
      visible={visible}
      titulo="Gestión de Columnas"
      onCerrar={onCerrar}
    >
      <Text style={styles.modalAyuda}>
        Añade columnas adicionales para clasificar tus movimientos (ej. Bizum,
        tarjeta, notas…).
      </Text>
      <View style={styles.modalInputContenedor}>
        <View style={styles.modalInputWrapper}>
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.textoSuave}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={nombre}
            onChangeText={(t) => {
              setNombre(t);
              setError(null);
            }}
            placeholder="Nueva columna..."
            placeholderTextColor={colors.textoMuySuave}
            style={styles.modalInput}
            onSubmitEditing={procesarAñadir}
          />
        </View>
        <Boton
          etiqueta="Añadir"
          onPress={procesarAñadir}
          compacto
          estilo={{ flex: 0, minWidth: 90 }}
        />
      </View>

      {error ? <Text style={styles.modalError}>{error}</Text> : null}
      <View style={styles.divisor} />

      <Text style={styles.modalSubtitulo}>Columnas Actuales</Text>
      {columnasExtra.length > 0 ? (
        <ScrollView
          style={{ maxHeight: 200 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalExtrasLista}>
            {columnasExtra.map((col: string) => (
              <View key={col} style={styles.modalExtraFila}>
                <View style={styles.modalExtraIcono}>
                  <Ionicons name="grid" size={14} color={colors.primario} />
                </View>
                <Text style={styles.modalExtraNombre}>{col}</Text>
                <Pressable
                  hitSlop={12}
                  onPress={() => eliminarColumna(col)}
                  style={({ pressed }) => [
                    styles.botonEliminarCol,
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="trash" size={16} color={colors.peligro} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.modalVacio}>
          <Ionicons
            name="folder-open-outline"
            size={36}
            color={colors.textoMuySuave}
          />
          <Text style={styles.modalSinExtras}>
            No hay columnas personalizadas.
          </Text>
        </View>
      )}
    </ModalCentro>
  );
}

const styles = StyleSheet.create({
  modalAyuda: {
    fontSize: 14,
    color: colors.textoSuave,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContenedor: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 6,
  },
  modalInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.texto,
  },
  modalError: {
    fontSize: 12,
    color: colors.peligro,
    marginTop: 4,
    marginLeft: 4,
  },
  divisor: { height: 1, backgroundColor: colors.borde, marginVertical: 20 },
  modalSubtitulo: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
    color: colors.textoSuave,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modalExtrasLista: { gap: 8 },
  modalExtraFila: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  modalExtraIcono: {
    backgroundColor: colors.tarjeta,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  modalExtraNombre: {
    flex: 1,
    fontSize: 15,
    color: colors.texto,
    fontWeight: "600",
  },
  botonEliminarCol: {
    padding: 6,
    backgroundColor: colors.tarjeta,
    borderRadius: 8,
  },
  modalVacio: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12,
  },
  modalSinExtras: {
    fontSize: 14,
    color: colors.textoMuySuave,
    fontWeight: "500",
  },
});
