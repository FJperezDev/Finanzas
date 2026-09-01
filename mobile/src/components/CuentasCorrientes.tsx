import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Cuenta } from "../core/calculations";
import { fmtEur } from "../core/formatos";
import { useCuentas } from "../hooks/useTransacciones";
import { colors } from "../theme";
import { TituloSeccion } from "./ui";

// ---------------------------------------------------------------------------
// Modal de gestión (crear / renombrar / eliminar cuentas corrientes)
// ---------------------------------------------------------------------------
export function CuentasModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { cuentas, crearCuenta, actualizarCuenta, eliminarCuenta } =
    useCuentas();
  const corrientes = cuentas.filter((c) => c.tipo === "corriente");

  const [vista, setVista] = useState<"lista" | "crear" | "editar">("lista");
  const [editando, setEditando] = useState<Cuenta | null>(null);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      setVista("lista");
      setEditando(null);
      setNombre("");
    }
  }, [visible]);

  const confirmar = (fn: () => void, mensaje: string) => {
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm(mensaje)) fn();
    } else {
      fn();
    }
  };

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    await crearCuenta({ nombre: nombre.trim(), tipo: "corriente" });
    setGuardando(false);
    setVista("lista");
    setNombre("");
  };

  const handleActualizar = async () => {
    if (!editando || !nombre.trim()) return;
    setGuardando(true);
    await actualizarCuenta(editando.id, {
      nombre: nombre.trim(),
      tipo: "corriente",
    });
    setGuardando(false);
    setVista("lista");
    setEditando(null);
    setNombre("");
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.contenedorModal}>
          <View style={styles.cabecera}>
            <TouchableOpacity
              onPress={() =>
                vista === "lista" ? onClose() : setVista("lista")
              }
              style={styles.btnIcono}
            >
              <Ionicons
                name={vista === "lista" ? "close" : "arrow-back"}
                size={24}
                color={colors.textoSuave}
              />
            </TouchableOpacity>
            <TituloSeccion style={{ marginBottom: 0 }}>
              {vista === "crear"
                ? "Nueva Cuenta"
                : vista === "editar"
                  ? "Renombrar Cuenta"
                  : "Mis Cuentas"}
            </TituloSeccion>
            <View style={{ width: 32 }} />
          </View>

          {vista === "lista" ? (
            <>
              <ScrollView
                style={styles.lista}
                showsVerticalScrollIndicator={false}
              >
                {corrientes.length === 0 ? (
                  <Text style={styles.vacio}>Aún no tienes cuentas.</Text>
                ) : (
                  corrientes.map((c) => (
                    <View key={c.id} style={styles.filaGestion}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.nombreCuenta}>{c.nombre}</Text>
                        <Text style={styles.subCuenta}>{fmtEur(c.balance)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.btnIcono}
                        onPress={() => {
                          setEditando(c);
                          setNombre(c.nombre);
                          setVista("editar");
                        }}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.textoSuave} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnBorrar}
                        onPress={() =>
                          confirmar(
                            () => eliminarCuenta(c.id),
                            `¿Eliminar la cuenta "${c.nombre}"? Sus traspasos asociados también se eliminarán.`,
                          )
                        }
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.peligro} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.btnPrimario}
                onPress={() => setVista("crear")}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.txtPrimario}>Nueva Cuenta Corriente</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Nombre de la cuenta *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: N26, BBVA…"
                placeholderTextColor={colors.textoMuySuave}
                value={nombre}
                onChangeText={setNombre}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.btnPrimario,
                  { opacity: guardando || !nombre ? 0.6 : 1 },
                ]}
                onPress={vista === "crear" ? handleCrear : handleActualizar}
                disabled={guardando || !nombre}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.txtPrimario}>
                    {vista === "crear" ? "Crear Cuenta" : "Guardar Cambios"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal de traspaso (con cuenta de origen preseleccionada)
// ---------------------------------------------------------------------------
export function TraspasoModal({
  cuenta,
  onClose,
}: {
  cuenta: Cuenta | null;
  onClose: () => void;
}) {
  const { cuentas, crearTraspaso } = useCuentas();
  const [fecha, setFecha] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("");
  const [destinoId, setDestinoId] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (cuenta) {
      setFecha(new Date().toISOString().split("T")[0]);
      setImporte("");
      setConcepto("");
      setDestinoId(0);
    }
  }, [cuenta]);

  if (!cuenta) return null;

  const destinos = cuentas.filter((c) => c.id !== cuenta.id);
  const destino = cuentas.find((c) => c.id === destinoId);

  const guardar = async () => {
    const importeNum = parseFloat(importe.replace(",", "."));
    if (isNaN(importeNum) || importeNum <= 0 || !destinoId) return;
    setGuardando(true);
    try {
      await crearTraspaso({
        fecha,
        importe: importeNum,
        concepto: concepto.trim(),
        cuenta_origen_id: cuenta.id,
        cuenta_destino_id: destinoId,
      });
      onClose();
    } catch (e) {
      // El error se gestiona en el store global (flash).
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={!!cuenta} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.contenedorModal}>
          <View style={styles.cabecera}>
            <TituloSeccion style={{ marginBottom: 0 }}>
              Traspaso desde {cuenta.nombre}
            </TituloSeccion>
            <TouchableOpacity onPress={onClose} style={styles.btnIcono}>
              <Ionicons name="close" size={24} color={colors.textoSuave} />
            </TouchableOpacity>
          </View>

          <Text style={styles.infoOrigen}>
            Balance disponible:{" "}
            <Text style={{ color: colors.texto, fontWeight: "700" }}>
              {fmtEur(cuenta.balance)}
            </Text>
          </Text>

          <Text style={styles.label}>Cuenta de destino</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {destinos.map((d) => {
              const activo = d.id === destinoId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDestinoId(d.id)}
                  style={[styles.chip, activo && styles.chipActivo]}
                >
                  <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                    {d.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Importe (€)</Text>
          <TextInput
            style={styles.input}
            value={importe}
            onChangeText={setImporte}
            placeholder="0.00"
            placeholderTextColor={colors.textoMuySuave}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Concepto (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={concepto}
            onChangeText={setConcepto}
            placeholder="Ej. Traspaso a cuenta remunerada…"
            placeholderTextColor={colors.textoMuySuave}
          />

          <TouchableOpacity
            style={[
              styles.btnPrimario,
              { opacity: guardando || !importe || !destinoId ? 0.6 : 1 },
            ]}
            onPress={guardar}
            disabled={guardando || !importe || !destinoId}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text style={styles.txtPrimario}>
                  Traspasar a {destino?.nombre ?? "…"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  btnIcono: { padding: 4 },
  vacio: {
    color: colors.textoSuave,
    textAlign: "center",
    paddingVertical: 12,
  },
  nombreCuenta: { fontSize: 15, color: colors.texto, fontWeight: "600", flex: 1 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  contenedorModal: {
    backgroundColor: colors.fondo,
    width: "100%",
    maxWidth: 450,
    maxHeight: "85%",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  lista: { marginBottom: 16 },
  filaGestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  subCuenta: { fontSize: 12, color: colors.textoSuave, marginTop: 2 },
  btnBorrar: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,75,75,0.1)",
  },
  btnPrimario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primario,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  txtPrimario: { color: "#fff", fontWeight: "700", fontSize: 15 },
  label: {
    color: colors.textoSuave,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 10,
    color: colors.texto,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  infoOrigen: {
    fontSize: 13,
    color: colors.textoSuave,
    marginBottom: 4,
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
  chipTextActivo: { color: "#fff", fontWeight: "700" },
});
