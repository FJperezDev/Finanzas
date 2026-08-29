import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions, // <--- Importamos esto
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ModalCentro, Boton } from "../ui";
import { useEditorStore } from "../../state/editorStore";
import { useDeudas } from "../../hooks/useTransacciones";
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
  Ocio: ["Ocio", "Restaurantes", "Viajes"],
  Inversión: ["Cartera de Inversión", "Cuenta Remunerada", "Marca Personal"],
  Fijo: ["Alquiler", "Comida", "Gimnasio", "Ropa", "Wifi", "Gastos"],
};

const CATEGORIAS_GASTO = ["Ocio", "Inversión", "Fijo"];

// --- COMPONENTE HELPER ---
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

// ============================================================================
// FORMULARIO: GASTO COMPARTIDO (TRICOUNT)
// ============================================================================
function FormularioCompartido({ onCerrar }: { onCerrar: () => void }) {
  const { contactos, crearGastoCompartido } = useDeudas();
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    Fecha: new Date().toISOString().split("T")[0],
    Categoria_Macro: "Fijo", // Fijo por defecto y oculto en UI
    Subcategoria: "Gastos",
    Concepto: "",
    Importe_Total: "",
    Pagador_ID: "YO" as number | "YO",
    Tipo_Reparto: "IGUALES" as "IGUALES" | "EXACTO",
  });

  const [participantesSeleccionados, setParticipantesSeleccionados] = useState<
    Set<number | "YO">
  >(new Set(["YO"]));

  const [importesExactos, setImportesExactos] = useState<
    Record<number, string>
  >({});

  const toggleParticipante = (id: number | "YO") => {
    const nuevos = new Set(participantesSeleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
      if (id !== "YO") {
        const exactosNuevos = { ...importesExactos };
        delete exactosNuevos[id as number];
        setImportesExactos(exactosNuevos);
      }
    } else {
      nuevos.add(id);
    }
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
      });

      setForm({
        ...form,
        Concepto: "",
        Importe_Total: "",
        Tipo_Reparto: "IGUALES",
        Pagador_ID: "YO",
      });
      setParticipantesSeleccionados(new Set(["YO"]));
      setImportesExactos({});
      onCerrar();
    } catch (e) {
      // Errores gestionados en el store global
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
            <Text style={styles.formLabel}>Coste Total (€)</Text>
            <TextInput
              style={styles.formInput}
              value={form.Importe_Total}
              onChangeText={(t) => setForm({ ...form, Importe_Total: t })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formCol, { flex: 1 }]}>
            <Text style={styles.formLabel}>Concepto</Text>
            <TextInput
              style={styles.formInput}
              value={form.Concepto}
              onChangeText={(t) => setForm({ ...form, Concepto: t })}
              placeholder="Ej. Compra compartida..."
            />
          </View>
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Categoría</Text>
          <SelectorPildoras
            opciones={MAPA_SUBCATEGORIAS["Fijo"]}
            valor={form.Subcategoria}
            onSelect={(sc) => setForm({ ...form, Subcategoria: sc })}
          />
        </View>

        <View style={styles.separador} />

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>¿Quién pagó el total?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => setForm({ ...form, Pagador_ID: "YO" })}
              style={[
                styles.chip,
                form.Pagador_ID === "YO" && styles.chipActivo,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  form.Pagador_ID === "YO" && styles.chipTextActivo,
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
                  style={[styles.chip, activo && styles.chipActivo]}
                >
                  <Text
                    style={[styles.chipText, activo && styles.chipTextActivo]}
                  >
                    {c.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>¿Cómo se divide?</Text>
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
                  styles.chipText,
                  form.Tipo_Reparto === "IGUALES" && styles.chipTextActivo,
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
                  styles.chipText,
                  form.Tipo_Reparto === "EXACTO" && styles.chipTextActivo,
                ]}
              >
                Por importe
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.formColUnico}>
          <Text style={styles.formLabel}>Selecciona quién participa</Text>
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

      <View style={styles.footerAccion}>
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

// ============================================================================
// FORMULARIO: MOVIMIENTO PERSONAL NORMAL
// ============================================================================
function FormularioPersonal({ onCerrar }: { onCerrar: () => void }) {
  const agregarFila = useEditorStore((s: any) => s.agregarFila);
  const [form, setForm] = useState({
    Fecha: new Date().toISOString().split("T")[0],
    Tipo: "Gasto",
    Categoria_Macro: "Fijo",
    Subcategoria: "Gastos",
    Concepto: "",
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

// ============================================================================
// COMPONENTE PRINCIPAL DEL MODAL
// ============================================================================
export function ModalAnadirMovimiento({
  visible,
  onCerrar,
}: {
  visible: boolean;
  onCerrar: () => void;
}) {
  const [modo, setModo] = useState<"PERSONAL" | "COMPARTIDO">("PERSONAL");
  const { height } = useWindowDimensions(); // Usamos esto para limitar la altura dinámicamente

  useEffect(() => {
    if (visible) setModo("PERSONAL");
  }, [visible]);

  return (
    <ModalCentro visible={visible} titulo="Nuevo Registro" onCerrar={onCerrar}>
      {/* Limitamos la altura a un 75% de la pantalla actual */}
      <View style={{ flexShrink: 1, maxHeight: height * 0.75 }}>
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
        </View>

        {modo === "PERSONAL" ? (
          <FormularioPersonal onCerrar={onCerrar} />
        ) : (
          <FormularioCompartido onCerrar={onCerrar} />
        )}
      </View>
    </ModalCentro>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const inputDateStyles: any = {
  backgroundColor: colors.fondo,
  border: `1px solid ${colors.bordeFuerte}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: colors.texto,
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

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
  tabActive: {
    backgroundColor: colors.primario,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textoSuave,
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  formContainerWrapper: {
    flexShrink: 1, // Permite encogerse sin desbordar el contenedor padre
    display: "flex",
    flexDirection: "column",
  },
  formScrollView: {
    flexShrink: 1,
    marginBottom: 16,
  },
  footerAccion: {
    marginTop: "auto",
  },

  formGrid: { gap: 14, paddingBottom: 8 },
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
  separador: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 4,
  },
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
