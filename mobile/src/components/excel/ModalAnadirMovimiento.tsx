import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { ModalCentro, Boton } from "../ui";
import { useEditorStore } from "../../state/editorStore";
import { colors } from "../../theme";

// --- MAPAS LÓGICOS ---
const MAPA_CATEGORIAS: Record<string, string[]> = {
  Ingreso: ["Nómina", "Regalo", "Deuda"],
  Gasto: ["Ocio", "Inversión", "Fijo"],
};

const MAPA_SUBCATEGORIAS: Record<string, string[]> = {
  Nómina: ["Nómina Principal", "Ingreso Secundario"],
  Regalo: ["Regalo"],
  Deuda: ["Ocio", "Alquiler", "Comida", "Wifi", "Gastos"],
  Ocio: ["Ocio"],
  Inversión: ["Cartera de Inversión", "Cuenta Remunerada"],
  Fijo: ["Alquiler", "Comida", "Gimnasio", "Ropa", "Wifi", "Gastos"],
};

// Componente helper para seleccionar opciones
function SelectorPildoras({
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
            style={[styles.chip, activo && styles.chipActivo]}
          >
            <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
              {op}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ModalAnadirMovimiento({
  visible,
  onCerrar,
}: {
  visible: boolean;
  onCerrar: () => void;
}) {
  const agregarFila = useEditorStore((s: any) => s.agregarFila);

  const [form, setForm] = useState({
    Fecha: new Date().toISOString().split("T")[0],
    Tipo: "Gasto",
    Categoria_Macro: "Fijo",
    Subcategoria: "Gastos",
    Concepto: "",
    Importe: "",
  });

  // Efecto Cascada para Categoría
  useEffect(() => {
    const cats = MAPA_CATEGORIAS[form.Tipo] || [];
    setForm((prev) => ({
      ...prev,
      Categoria_Macro: cats[0] || "",
      Subcategoria: "",
    }));
  }, [form.Tipo]);

  // Efecto Cascada para Subcategoría
  useEffect(() => {
    if (form.Categoria_Macro) {
      const subcats = MAPA_SUBCATEGORIAS[form.Categoria_Macro] || [];
      setForm((prev) => ({ ...prev, Subcategoria: subcats[0] || "" }));
    }
  }, [form.Categoria_Macro]);

  const guardar = () => {
    if (!form.Concepto || !form.Importe) return;
    agregarFila({
      ...form,
      Importe: parseFloat(form.Importe.replace(",", ".")),
    });
    onCerrar();
    setForm({ ...form, Concepto: "", Importe: "" });
  };

  return (
    <ModalCentro
      visible={visible}
      titulo="Nuevo Movimiento"
      onCerrar={onCerrar}
    >
      <View style={styles.formGrid}>
        {/* FILA 1: FECHA Y DINERO */}
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.formLabel}>Fecha</Text>
            {/* Input nativo de HTML5 para web que abre el calendario del navegador */}
            <input
              type="date"
              value={form.Fecha}
              onChange={(e) => setForm({ ...form, Fecha: e.target.value })}
              style={{
                backgroundColor: colors.fondo,
                border: `1px solid ${colors.bordeFuerte}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                color: colors.texto,
                fontFamily: "inherit",
                outline: "none",
                width: "100%",
                boxSizing: "border-box", // Asegura que el padding no rompa el ancho
              }}
            />
          </View>

          <View style={styles.formCol}>
            <Text style={styles.formLabel}>Importe (€)</Text>
            <TextInput
              style={styles.formInput}
              value={form.Importe}
              onChangeText={(t) => setForm({ ...form, Importe: t })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* FILA 2: TIPO */}
        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Tipo de Movimiento</Text>
          <SelectorPildoras
            opciones={["Ingreso", "Gasto"]}
            valor={form.Tipo}
            onSelect={(t) => setForm({ ...form, Tipo: t })}
          />
        </View>

        {/* FILA 3: CATEGORÍA */}
        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Categoría</Text>
          <SelectorPildoras
            opciones={MAPA_CATEGORIAS[form.Tipo]}
            valor={form.Categoria_Macro}
            onSelect={(c) => setForm({ ...form, Categoria_Macro: c })}
          />
        </View>

        {/* FILA 4: SUBCATEGORÍA */}
        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Subcategoría</Text>
          <SelectorPildoras
            opciones={MAPA_SUBCATEGORIAS[form.Categoria_Macro]}
            valor={form.Subcategoria}
            onSelect={(sc) => setForm({ ...form, Subcategoria: sc })}
          />
        </View>

        {/* FILA 5: CONCEPTO */}
        <View style={styles.formRow}>
          <View style={[styles.formCol, { flex: 1 }]}>
            <Text style={styles.formLabel}>Concepto (Descripción)</Text>
            <TextInput
              style={styles.formInput}
              value={form.Concepto}
              onChangeText={(t) => setForm({ ...form, Concepto: t })}
              placeholder="Ej. Cena fin de semana..."
            />
          </View>
        </View>
      </View>
      <Boton
        etiqueta="Añadir Movimiento"
        icono="add-circle"
        onPress={guardar}
        estilo={{ marginTop: 20, flex: 0 }}
        deshabilitado={!form.Concepto || !form.Importe}
      />
    </ModalCentro>
  );
}

const styles = StyleSheet.create({
  formGrid: { gap: 14 },
  formRow: { flexDirection: "row", gap: 12 },
  formCol: { flex: 1, gap: 6 },
  formColUnico: { gap: 6 },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.texto,
  },
  chip: {
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActivo: {
    backgroundColor: colors.primario,
    borderColor: colors.primario,
  },
  chipText: { fontSize: 13, color: colors.texto, fontWeight: "500" },
  chipTextActivo: { color: "#ffffff", fontWeight: "700" },
  sinOpciones: {
    fontSize: 13,
    color: colors.textoMuySuave,
    fontStyle: "italic",
    marginTop: 4,
  },
});
