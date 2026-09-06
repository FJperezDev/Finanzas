import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formStyles, inputDateStyles, MAPA_SUBCATEGORIAS } from "./formStyles";
import { SelectorPildoras } from "./SelectorPildoras";
import { Boton } from "../../ui";
import { useDeudas, useCuentas } from "../../../hooks/useTransacciones";
import { colors } from "../../../theme";

export function FormularioCompartido({ onCerrar }: { onCerrar: () => void }) {
  const { contactos, crearGastoCompartido } = useDeudas();
  const { cuentas } = useCuentas();

  // Filtramos solo tus cuentas corrientes reales
  const cuentasCorrientes = cuentas.filter((c) => c.tipo === "corriente");

  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    Fecha: new Date().toISOString().split("T")[0],
    Categoria_Macro: "Fijo",
    Subcategoria: "Gastos",
    Concepto: "",
    Importe_Total: "",
    Pagador_ID: "YO" as number | "YO",
    Cuenta_Origen: "", // <- Nuevo campo para tu cuenta
    Tipo_Reparto: "IGUALES" as "IGUALES" | "EXACTO",
  });

  const [participantesSeleccionados, setParticipantesSeleccionados] = useState<
    Set<number | "YO">
  >(new Set(["YO"]));
  const [importesExactos, setImportesExactos] = useState<
    Record<number, string>
  >({});

  // Auto-seleccionar la primera cuenta corriente por defecto si vas a pagar tú
  useEffect(() => {
    if (!form.Cuenta_Origen && cuentasCorrientes.length > 0) {
      setForm((prev) => ({
        ...prev,
        Cuenta_Origen: cuentasCorrientes[0].nombre,
      }));
    }
  }, [cuentasCorrientes, form.Cuenta_Origen]);

  const toggleParticipante = (id: number | "YO") => {
    const nuevos = new Set(participantesSeleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
      if (id !== "YO") {
        const exactosNuevos = { ...importesExactos };
        delete exactosNuevos[id as number];
        setImportesExactos(exactosNuevos);
      }
    } else nuevos.add(id);
    setParticipantesSeleccionados(nuevos);
  };

  const guardar = async () => {
    const importeNum = parseFloat(form.Importe_Total.replace(",", "."));
    if (
      !form.Concepto ||
      isNaN(importeNum) ||
      importeNum <= 0 ||
      participantesSeleccionados.size === 0
    )
      return;
    setGuardando(true);

    let tipoRepartoFinal = form.Tipo_Reparto;
    let participantesArray: any[] = [];

    // ... (Tu misma lógica de reparto IGUALES / EXACTO se mantiene intacta) ...
    if (form.Tipo_Reparto === "IGUALES") {
      if (participantesSeleccionados.has("YO")) {
        tipoRepartoFinal = "IGUALES";
        participantesArray = Array.from(participantesSeleccionados)
          .filter((id) => id !== "YO")
          .map((id) => ({ contacto_id: id as number }));
      } else {
        tipoRepartoFinal = "EXACTO";
        const porPersona = importeNum / participantesSeleccionados.size;
        participantesArray = Array.from(participantesSeleccionados).map(
          (id) => ({
            contacto_id: id as number,
            importe_exacto: parseFloat(porPersona.toFixed(2)),
          }),
        );
      }
    } else {
      tipoRepartoFinal = "EXACTO";
      participantesArray = Array.from(participantesSeleccionados)
        .filter((id) => id !== "YO")
        .map((id) => ({
          contacto_id: id as number,
          importe_exacto: parseFloat(
            importesExactos[id as number]?.replace(",", ".") || "0",
          ),
        }));
    }

    try {
      await crearGastoCompartido({
        concepto: form.Concepto,
        fecha: form.Fecha,
        importe_total: importeNum,
        categoria_macro: form.Categoria_Macro,
        subcategoria: form.Subcategoria,
        tipo_reparto: tipoRepartoFinal,
        pagador_id: form.Pagador_ID === "YO" ? null : form.Pagador_ID,
        participantes: participantesArray,
        cuenta_origen:
          form.Pagador_ID === "YO" ? form.Cuenta_Origen : undefined, // <- Pasamos la cuenta si pagas tú
      });

      onCerrar();
    } catch (e) {
      // Errores globales
    } finally {
      setGuardando(false);
    }
  };

  const importeTotalCalculado =
    parseFloat(form.Importe_Total.replace(",", ".")) || 0;
  const sumaOtros = Object.values(importesExactos).reduce(
    (acc, val) => acc + (parseFloat(val.replace(",", ".")) || 0),
    0,
  );
  const restoParaMi = Math.max(0, importeTotalCalculado - sumaOtros);
  const formValido =
    form.Concepto.length > 0 &&
    form.Importe_Total.length > 0 &&
    participantesSeleccionados.size > 0 &&
    !guardando;
  const todosParticipantes = [
    { id: "YO" as const, nombre: "Yo" },
    ...contactos,
  ];

  return (
    <View style={formStyles.formContainerWrapper}>
      <ScrollView
        style={formStyles.formScrollView}
        contentContainerStyle={formStyles.formGrid}
        showsVerticalScrollIndicator={false}
      >
        {/* Fecha y Coste */}
        <View style={formStyles.formRow}>
          <View style={formStyles.formCol}>
            <Text style={formStyles.formLabel}>Fecha</Text>
            <input
              type="date"
              value={form.Fecha}
              onChange={(e) => setForm({ ...form, Fecha: e.target.value })}
              style={inputDateStyles}
            />
          </View>
          <View style={formStyles.formCol}>
            <Text style={formStyles.formLabel}>Coste Total (€)</Text>
            <TextInput
              style={formStyles.formInput}
              value={form.Importe_Total}
              onChangeText={(t) => setForm({ ...form, Importe_Total: t })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Concepto y Subcategoría */}
        <View style={formStyles.formRow}>
          <View style={[formStyles.formCol, { flex: 1 }]}>
            <Text style={formStyles.formLabel}>Concepto</Text>
            <TextInput
              style={formStyles.formInput}
              value={form.Concepto}
              onChangeText={(t) => setForm({ ...form, Concepto: t })}
              placeholder="Ej. Compra compartida..."
            />
          </View>
        </View>
        <View style={formStyles.formColUnico}>
          <Text style={formStyles.formLabel}>Categoría</Text>
          <SelectorPildoras
            opciones={MAPA_SUBCATEGORIAS["Fijo"]}
            valor={form.Subcategoria}
            onSelect={(sc) => setForm({ ...form, Subcategoria: sc })}
          />
        </View>

        <View style={formStyles.separador} />

        {/* Pagador */}
        <View style={formStyles.formColUnico}>
          <Text style={formStyles.formLabel}>¿Quién pagó el total?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => setForm({ ...form, Pagador_ID: "YO" })}
              style={[
                formStyles.chip,
                form.Pagador_ID === "YO" && formStyles.chipActivo,
              ]}
            >
              <Text
                style={[
                  formStyles.chipText,
                  form.Pagador_ID === "YO" && formStyles.chipTextActivo,
                ]}
              >
                Yo
              </Text>
            </Pressable>
            {contactos.map((c) => {
              const activo = form.Pagador_ID === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setForm({ ...form, Pagador_ID: c.id })}
                  style={[formStyles.chip, activo && formStyles.chipActivo]}
                >
                  <Text
                    style={[
                      formStyles.chipText,
                      activo && formStyles.chipTextActivo,
                    ]}
                  >
                    {c.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* NUEVO: Si pagaste tú, elige desde qué cuenta */}
        {form.Pagador_ID === "YO" && (
          <View style={formStyles.formColUnico}>
            <Text style={formStyles.formLabel}>
              ¿Desde qué cuenta has pagado?
            </Text>
            <SelectorPildoras
              opciones={cuentasCorrientes.map((c) => c.nombre)}
              valor={form.Cuenta_Origen}
              onSelect={(c) => setForm({ ...form, Cuenta_Origen: c })}
            />
          </View>
        )}

        <View style={formStyles.separador} />

        {/* Tipo Reparto */}
        <View style={formStyles.formColUnico}>
          <Text style={formStyles.formLabel}>¿Cómo se divide?</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setForm({ ...form, Tipo_Reparto: "IGUALES" })}
              style={[
                styles.chipReparto,
                form.Tipo_Reparto === "IGUALES" && styles.chipRepartoActivo,
              ]}
            >
              <Ionicons
                name="pie-chart-outline"
                size={16}
                color={
                  form.Tipo_Reparto === "IGUALES" ? "#fff" : colors.textoSuave
                }
              />
              <Text
                style={[
                  formStyles.chipText,
                  form.Tipo_Reparto === "IGUALES" && formStyles.chipTextActivo,
                ]}
              >
                Partes Iguales
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setForm({ ...form, Tipo_Reparto: "EXACTO" })}
              style={[
                styles.chipReparto,
                form.Tipo_Reparto === "EXACTO" && styles.chipRepartoActivo,
              ]}
            >
              <Ionicons
                name="options-outline"
                size={16}
                color={
                  form.Tipo_Reparto === "EXACTO" ? "#fff" : colors.textoSuave
                }
              />
              <Text
                style={[
                  formStyles.chipText,
                  form.Tipo_Reparto === "EXACTO" && formStyles.chipTextActivo,
                ]}
              >
                Por importe
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Participantes */}
        <View style={formStyles.formColUnico}>
          <Text style={formStyles.formLabel}>Selecciona quién participa</Text>
          <View style={{ gap: 8 }}>
            {todosParticipantes.map((c) => {
              const seleccionado = participantesSeleccionados.has(c.id);
              return (
                <View key={c.id} style={styles.filaParticipante}>
                  <Pressable
                    style={styles.btnCheck}
                    onPress={() => toggleParticipante(c.id)}
                  >
                    <Ionicons
                      name={seleccionado ? "checkbox" : "square-outline"}
                      size={24}
                      color={
                        seleccionado ? colors.primario : colors.textoMuySuave
                      }
                    />
                    <Text style={styles.nombreParticipante}>{c.nombre}</Text>
                  </Pressable>
                  {seleccionado &&
                    form.Tipo_Reparto === "EXACTO" &&
                    (c.id === "YO" ? (
                      <Text style={styles.textoRestante}>
                        Auto: {restoParaMi.toFixed(2)} €
                      </Text>
                    ) : (
                      <TextInput
                        style={styles.inputPequeno}
                        placeholder="0.00 €"
                        placeholderTextColor={colors.textoMuySuave}
                        keyboardType="numeric"
                        value={importesExactos[c.id] || ""}
                        onChangeText={(t) =>
                          setImportesExactos({ ...importesExactos, [c.id]: t })
                        }
                      />
                    ))}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={formStyles.footerAccion}>
        <Boton
          etiqueta={
            guardando ? "Registrando deuda..." : "Añadir Gasto Compartido"
          }
          icono="people-circle"
          onPress={guardar}
          estilo={{ flex: 0 }}
          deshabilitado={!formValido}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipReparto: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 10,
    paddingVertical: 12,
  },
  chipRepartoActivo: {
    backgroundColor: colors.primario,
    borderColor: colors.primario,
  },
  filaParticipante: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 8,
    paddingRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  btnCheck: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  nombreParticipante: { color: colors.texto, fontSize: 15, fontWeight: "500" },
  inputPequeno: {
    width: 80,
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.texto,
    textAlign: "right",
  },
  textoRestante: {
    fontSize: 13,
    color: colors.textoMuySuave,
    marginRight: 8,
    fontVariant: ["tabular-nums"],
  },
});
