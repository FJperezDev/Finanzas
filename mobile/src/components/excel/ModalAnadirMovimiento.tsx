import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ModalCentro } from "../ui";
import { colors } from "../../theme";
import { FormularioPersonal } from "./formularios/FormularioPersonal";
import { FormularioCompartido } from "./formularios/FormularioCompartido";
import { FormularioTraspaso } from "./formularios/FormularioTraspaso";

export function ModalAnadirMovimiento({
  visible,
  onCerrar,
}: {
  visible: boolean;
  onCerrar: () => void;
}) {
  const [modo, setModo] = useState<"PERSONAL" | "COMPARTIDO" | "TRASPASO">(
    "PERSONAL",
  );
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (visible) setModo("PERSONAL");
  }, [visible]);

  return (
    <ModalCentro visible={visible} titulo="Nuevo Registro" onCerrar={onCerrar}>
      <View style={{ flexShrink: 1, maxHeight: height * 0.75 }}>
        {/* TABS NAVEGACIÓN */}
        <View style={styles.tabsContainer}>
          <Pressable
            onPress={() => setModo("PERSONAL")}
            style={[styles.tab, modo === "PERSONAL" && styles.tabActive]}
          >
            <Ionicons
              name="person"
              size={16}
              color={modo === "PERSONAL" ? "#fff" : colors.textoSuave}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={[
                styles.tabText,
                modo === "PERSONAL" && styles.tabTextActive,
              ]}
            >
              Personal
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setModo("COMPARTIDO")}
            style={[styles.tab, modo === "COMPARTIDO" && styles.tabActive]}
          >
            <Ionicons
              name="people"
              size={18}
              color={modo === "COMPARTIDO" ? "#fff" : colors.textoSuave}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={[
                styles.tabText,
                modo === "COMPARTIDO" && styles.tabTextActive,
              ]}
            >
              Compartido
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setModo("TRASPASO")}
            style={[styles.tab, modo === "TRASPASO" && styles.tabActive]}
          >
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={modo === "TRASPASO" ? "#fff" : colors.textoSuave}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={[
                styles.tabText,
                modo === "TRASPASO" && styles.tabTextActive,
              ]}
            >
              Traspaso
            </Text>
          </Pressable>
        </View>

        {/* RENDERING DINÁMICO */}
        {modo === "PERSONAL" ? (
          <FormularioPersonal onCerrar={onCerrar} />
        ) : modo === "COMPARTIDO" ? (
          <FormularioCompartido onCerrar={onCerrar} />
        ) : (
          <FormularioTraspaso onCerrar={onCerrar} />
        )}
      </View>
    </ModalCentro>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabActive: { backgroundColor: colors.primario },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.textoSuave },
  tabTextActive: { color: "#ffffff", fontWeight: "700" },
});
