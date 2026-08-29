import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";

import { useDeudas } from "../hooks/useTransacciones";
import { colors } from "../theme";
import { TituloSeccion } from "./ui";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function archivoADataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

export function ContactosModal({ visible, onClose }: Props) {
  const { contactos, crearContacto, eliminarContacto, subirAvatar } =
    useDeudas();
  const [vista, setVista] = useState<"lista" | "crear">("lista");

  const inputArchivoRef = useRef<HTMLInputElement | null>(null);
  const [avatarObjetivo, setAvatarObjetivo] = useState<number | null>(null);

  // Estado del formulario
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("+34");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const elegirAvatar = (id: number) => {
    setAvatarObjetivo(id);
    inputArchivoRef.current?.click();
  };

  const alCambiarArchivo = async (
    evento: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || avatarObjetivo == null) return;
    const objetivo = avatarObjetivo;
    setAvatarObjetivo(null);
    try {
      const dataUrl = await archivoADataUrl(archivo);
      await subirAvatar(objetivo, dataUrl);
    } catch {
      // El error se gestiona en el store global (flash).
    }
  };

  const limpiarFormulario = () => {
    setNombre("");
    setTelefono("+34");
    setCorreo("");
    setDireccion("");
  };

  const handleCerrar = () => {
    setVista("lista");
    limpiarFormulario();
    onClose();
  };

  const handleCrear = async () => {
    if (!nombre.trim() || !telefono.trim()) return;
    setGuardando(true);
    await crearContacto({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      correo: correo.trim() || null,
      direccion: direccion.trim(),
      icono: null,
    });
    setGuardando(false);
    setVista("lista");
    limpiarFormulario();
  };

  const handleEliminar = (id: number, nombreContacto: string) => {
    // En Web usamos window.confirm, en móvil Alert.alert (o una simple confirmación)
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm(`¿Seguro que deseas eliminar a ${nombreContacto}?`)) {
        eliminarContacto(id);
      }
    } else {
      Alert.alert(
        "Eliminar contacto",
        `¿Seguro que deseas eliminar a ${nombreContacto}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => eliminarContacto(id),
          },
        ],
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.contenedor}>
          {Platform.OS === "web" && (
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={alCambiarArchivo}
            />
          )}
          <View style={styles.cabecera}>
            <TouchableOpacity
              onPress={() =>
                vista === "crear" ? setVista("lista") : handleCerrar()
              }
              style={styles.btnIcono}
            >
              <Ionicons
                name={vista === "crear" ? "arrow-back" : "close"}
                size={24}
                color={colors.textoSuave}
              />
            </TouchableOpacity>
            <TituloSeccion style={{ marginBottom: 0 }}>
              {vista === "crear" ? "Nuevo Contacto" : "Mis Contactos"}
            </TituloSeccion>
            <View style={{ width: 32 }} />
          </View>

          {vista === "lista" ? (
            <>
              <ScrollView
                style={styles.lista}
                showsVerticalScrollIndicator={false}
              >
                {contactos.length === 0 ? (
                  <Text style={styles.vacio}>
                    Aún no tienes contactos creados.
                  </Text>
                ) : (
                  contactos.map((c) => (
                    <View key={c.id} style={styles.filaContacto}>
                      <View style={styles.infoContacto}>
                        <View style={styles.avatar}>
                          {c.icono ? (
                            <Image
                              source={{ uri: c.icono }}
                              style={styles.avatarImagen}
                            />
                          ) : (
                            <Text style={styles.avatarLetra}>
                              {c.nombre.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nombre}>{c.nombre}</Text>
                          <Text style={styles.telefono}>{c.telefono}</Text>
                          {!!c.correo && (
                            <Text style={styles.extra}>{c.correo}</Text>
                          )}
                          {!!c.direccion && (
                            <Text style={styles.extra}>{c.direccion}</Text>
                          )}
                        </View>
                      </View>

                      {Platform.OS === "web" && (
                        <TouchableOpacity
                          onPress={() => elegirAvatar(c.id)}
                          style={styles.btnCamara}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={16}
                            color={colors.textoSuave}
                          />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => handleEliminar(c.id, c.nombre)}
                        style={styles.btnBorrar}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.peligro}
                        />
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
                <Text style={styles.txtBtnPrimario}>Nuevo Contacto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView
              style={styles.formulario}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Laura"
                placeholderTextColor={colors.textoMuySuave}
                value={nombre}
                onChangeText={setNombre}
                autoFocus
              />

              <Text style={styles.label}>Teléfono (con prefijo) *</Text>
              <TextInput
                style={styles.input}
                placeholder="+34..."
                placeholderTextColor={colors.textoMuySuave}
                value={telefono}
                onChangeText={(t) => {
                  // Asegurarse de que SIEMPRE empiece por +34
                  if (!t.startsWith("+34")) {
                    setTelefono("+34");
                    return;
                  }

                  // Extraemos lo que hay después del +34
                  const resto = t.slice(3);

                  // Filtramos para que solo queden números
                  const soloNumeros = resto.replace(/[^0-9]/g, "");

                  // Actualizamos el estado uniendo el prefijo fijo y los números limpios
                  setTelefono("+34" + soloNumeros);
                }}
                keyboardType="phone-pad"
                maxLength={12} // +34 (3 caracteres) + 9 números de España = 12
              />

              <Text style={styles.label}>Correo electrónico (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textoMuySuave}
                value={correo}
                onChangeText={setCorreo}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Dirección (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Calle Mayor 1, Madrid"
                placeholderTextColor={colors.textoMuySuave}
                value={direccion}
                onChangeText={setDireccion}
              />

              <TouchableOpacity
                style={[
                  styles.btnPrimario,
                  { opacity: guardando || !nombre ? 0.6 : 1 },
                ]}
                onPress={handleCrear}
                disabled={guardando || !nombre || !telefono}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.txtBtnPrimario}>Guardar Contacto</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  contenedor: {
    backgroundColor: colors.fondo,
    width: "100%",
    maxWidth: 450,
    maxHeight: "85%",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  btnIcono: { padding: 4, width: 32, alignItems: "center" },
  lista: { marginBottom: 20 },
  vacio: { color: colors.textoSuave, textAlign: "center", marginTop: 20 },
  filaContacto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  infoContacto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImagen: { width: 40, height: 40, borderRadius: 20 },
  avatarLetra: { color: colors.texto, fontWeight: "bold", fontSize: 16 },
  nombre: { color: colors.texto, fontWeight: "600", fontSize: 15 },
  telefono: { color: colors.textoSuave, fontSize: 13, marginTop: 2 },
  extra: { color: colors.textoMuySuave, fontSize: 12, marginTop: 1 },
  btnCamara: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btnBorrar: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 75, 75, 0.1)",
  },

  btnPrimario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primario,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  txtBtnPrimario: { color: "#fff", fontWeight: "600", fontSize: 15 },

  formulario: { gap: 4 },
  label: {
    color: colors.textoSuave,
    fontSize: 13,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: colors.texto,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 6,
  },
});
