import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";

import type { Cuenta } from "../../../core/calculations";
import { useCuentas } from "../../../hooks/useTransacciones";
import { Boton } from "../../ui";
import { SelectorPildoras } from "./SelectorPildoras";
import { formStyles as styles, inputDateStyles } from "./formStyles";

export function FormularioTraspaso({
  onCerrar,
  cuentaOrigenInicial,
}: {
  onCerrar: () => void;
  cuentaOrigenInicial?: Cuenta | null;
}) {
  const { cuentas, crearTraspaso } = useCuentas();
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    Fecha: new Date().toISOString().split("T")[0],
    Importe: "",
    Concepto: "",
    Cuenta_Origen_ID: 0,
    Cuenta_Destino_ID: 0,
  });

  useEffect(() => {
    if (cuentas.length === 0) return;
    const origenInicial = cuentaOrigenInicial ?? cuentas[0];
    setForm((prev) => ({
      ...prev,
      Cuenta_Origen_ID: prev.Cuenta_Origen_ID || origenInicial.id,
    }));
  }, [cuentas, cuentaOrigenInicial]);

  const origen = cuentas.find((c) => c.id === form.Cuenta_Origen_ID);
  const destinos = cuentas.filter((c) => c.id !== form.Cuenta_Origen_ID);

  // Si al cambiar origen el destino quedó igual, lo limpiamos.
  useEffect(() => {
    if (
      form.Cuenta_Destino_ID &&
      form.Cuenta_Destino_ID === form.Cuenta_Origen_ID
    ) {
      setForm((prev) => ({ ...prev, Cuenta_Destino_ID: 0 }));
    }
  }, [form.Cuenta_Origen_ID, form.Cuenta_Destino_ID]);

  const guardar = async () => {
    const importeNum = parseFloat(form.Importe.replace(",", "."));
    if (
      isNaN(importeNum) ||
      importeNum <= 0 ||
      !form.Cuenta_Origen_ID ||
      !form.Cuenta_Destino_ID
    )
      return;

    setGuardando(true);
    try {
      await crearTraspaso({
        fecha: form.Fecha,
        importe: importeNum,
        concepto: form.Concepto,
        cuenta_origen_id: form.Cuenta_Origen_ID,
        cuenta_destino_id: form.Cuenta_Destino_ID,
      });
      setForm({ ...form, Importe: "", Concepto: "" });
      onCerrar();
    } catch (e) {
      // El error se gestiona en el store global (flash).
    } finally {
      setGuardando(false);
    }
  };

  const formValido =
    form.Importe.length > 0 &&
    form.Cuenta_Origen_ID !== 0 &&
    form.Cuenta_Destino_ID !== 0 &&
    !guardando;

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
          <Text style={styles.formLabel}>Cuenta de origen</Text>
          <SelectorPildoras
            opciones={cuentas.map((c) => c.nombre)}
            valor={origen?.nombre ?? ""}
            onSelect={(nombre) => {
              const cuenta = cuentas.find((c) => c.nombre === nombre);
              if (cuenta) setForm({ ...form, Cuenta_Origen_ID: cuenta.id });
            }}
          />
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Cuenta de destino</Text>
          <SelectorPildoras
            opciones={destinos.map((c) => c.nombre)}
            valor={
              cuentas.find((c) => c.id === form.Cuenta_Destino_ID)?.nombre ?? ""
            }
            onSelect={(nombre) => {
              const cuenta = cuentas.find((c) => c.nombre === nombre);
              if (cuenta) setForm({ ...form, Cuenta_Destino_ID: cuenta.id });
            }}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formCol, { flex: 1 }]}>
            <Text style={styles.formLabel}>Concepto (Opcional)</Text>
            <TextInput
              style={styles.formInput}
              value={form.Concepto}
              onChangeText={(t) => setForm({ ...form, Concepto: t })}
              placeholder="Ej. Traspaso a Revolut..."
            />
          </View>
        </View>

        <Text style={styles.notaTraspaso}>
          Los traspasos mueven dinero entre cuentas sin contabilizarse como
          gasto ni ingreso.
        </Text>
      </ScrollView>

      <View style={styles.footerAccion}>
        <Boton
          etiqueta={guardando ? "Registrando..." : "Realizar Traspaso"}
          icono="swap-horizontal"
          onPress={guardar}
          estilo={{ flex: 0 }}
          deshabilitado={!formValido}
        />
      </View>
    </View>
  );
}
