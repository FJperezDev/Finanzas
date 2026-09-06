import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";

import { useEditorStore } from "../../../state/editorStore";
import { useCuentas } from "../../../hooks/useTransacciones";
import { Boton } from "../../ui";
import { SelectorPildoras } from "./SelectorPildoras";
import {
  formStyles as styles,
  inputDateStyles,
  MAPA_CATEGORIAS,
  MAPA_SUBCATEGORIAS,
} from "./formStyles";

export function FormularioPersonal({ onCerrar }: { onCerrar: () => void }) {
  const agregarFila = useEditorStore((s: any) => s.agregarFila);
  const { cuentas } = useCuentas();
  const cuentasCorrientes = cuentas.filter((c) => c.tipo === "corriente");

  const [form, setForm] = useState({
    Fecha: new Date().toISOString().split("T")[0],
    Tipo: "Gasto",
    Categoria_Macro: "Fijo",
    Subcategoria: "Gastos",
    Concepto: "",
    Cuenta: "",
    Importe: "",
  });

  useEffect(() => {
    const cats = MAPA_CATEGORIAS[form.Tipo] || [];
    setForm((prev) => ({
      ...prev,
      Categoria_Macro: cats[0] || "",
      Subcategoria: "",
    }));
  }, [form.Tipo]);

  useEffect(() => {
    if (form.Categoria_Macro) {
      const subcats = MAPA_SUBCATEGORIAS[form.Categoria_Macro] || [];
      setForm((prev) => ({ ...prev, Subcategoria: subcats[0] || "" }));
    }
  }, [form.Categoria_Macro]);

  useEffect(() => {
    if (!form.Cuenta && cuentasCorrientes.length > 0) {
      setForm((prev) => ({ ...prev, Cuenta: cuentasCorrientes[0].nombre }));
    }
  }, [cuentasCorrientes, form.Cuenta]);

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
    <View style={styles.formContainerWrapper}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formGrid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Text style={styles.formLabel}>Fecha</Text>
            <input
              type="date"
              value={form.Fecha}
              onChange={(e) => setForm({ ...form, Fecha: e.target.value })}
              style={inputDateStyles}
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

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Tipo de Movimiento</Text>
          <SelectorPildoras
            opciones={["Ingreso", "Gasto"]}
            valor={form.Tipo}
            onSelect={(t) => setForm({ ...form, Tipo: t })}
          />
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Categoría</Text>
          <SelectorPildoras
            opciones={MAPA_CATEGORIAS[form.Tipo]}
            valor={form.Categoria_Macro}
            onSelect={(c) => setForm({ ...form, Categoria_Macro: c })}
          />
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Subcategoría</Text>
          <SelectorPildoras
            opciones={MAPA_SUBCATEGORIAS[form.Categoria_Macro]}
            valor={form.Subcategoria}
            onSelect={(sc) => setForm({ ...form, Subcategoria: sc })}
          />
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Cuenta de origen</Text>
          <SelectorPildoras
            opciones={cuentasCorrientes.map((c) => c.nombre)}
            valor={form.Cuenta}
            onSelect={(c) => setForm({ ...form, Cuenta: c })}
          />
        </View>

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
      </ScrollView>

      <View style={styles.footerAccion}>
        <Boton
          etiqueta="Añadir Movimiento"
          icono="add-circle"
          onPress={guardar}
          estilo={{ flex: 0 }}
          deshabilitado={!form.Concepto || !form.Importe}
        />
      </View>
    </View>
  );
}
