import { Ionicons } from "@expo/vector-icons";
import type { DrawerScreenProps } from "@react-navigation/drawer";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { MyIcon } from "../components/MyIcon";
import { useAuthStore } from "../state/authStore";
import { colors } from "../theme";

type Props = DrawerScreenProps<any, "Login">;

export function LoginScreen({ navigation }: Props) {
  const usuarioAuth = useAuthStore((s) => s.usuario);
  const autenticado = useAuthStore((s) => s.estado === "autenticado");
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);

  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (enviando) return;
    if (!usuario.trim() || !contrasena) {
      setError("Escribe el usuario y la contraseña.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(usuario.trim(), contrasena);
      navigation.navigate("Dashboard");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tarjeta}>
          <View style={styles.logo}>
            <MyIcon />
          </View>
          <Text style={styles.titulo}>Iniciar sesión</Text>
          <Text style={styles.subtitulo}>
            Conecta con el backend para trabajar con tus datos reales.
          </Text>

          {autenticado ? (
            <View style={styles.yaLogueado}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.exito}
              />
              <Text style={styles.yaLogueadoTexto}>
                Sesión activa como {usuarioAuth}. Ya puedes usar la aplicación.
              </Text>
              <Pressable
                style={styles.botonVolver}
                onPress={() => navigation.navigate("Dashboard")}
              >
                <Text style={styles.botonVolverTexto}>Volver al Dashboard</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.campo}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.textoSuave}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Usuario"
                  placeholderTextColor={colors.textoMuySuave}
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!enviando}
                />
              </View>

              <View style={styles.campo}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textoSuave}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textoMuySuave}
                  value={contrasena}
                  onChangeText={setContrasena}
                  secureTextEntry={!mostrarClave}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!enviando}
                  onSubmitEditing={enviar}
                />
                <Pressable
                  onPress={() => setMostrarClave((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel="Mostrar u ocultar contraseña"
                >
                  <Ionicons
                    name={mostrarClave ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textoSuave}
                  />
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorFila}>
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={colors.peligro}
                  />
                  <Text style={styles.errorTexto}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.boton,
                  (pressed || enviando) && styles.botonActivo,
                ]}
                onPress={enviar}
                disabled={enviando}
              >
                {enviando ? (
                  <ActivityIndicator size="small" color={colors.textoInvertido} />
                ) : (
                  <Ionicons
                    name="log-in-outline"
                    size={18}
                    color={colors.textoInvertido}
                  />
                )}
                <Text style={styles.botonTexto}>
                  {enviando ? "Conectando…" : "Iniciar sesión"}
                </Text>
              </Pressable>

              <Text style={styles.aviso}>
                Las credenciales del administrador se configuran en el backend
                mediante variables de entorno.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  tarjeta: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.tarjeta,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 16,
    padding: 24,
    gap: 14,
  },
  logo: { width: 90, height: 45, alignSelf: "center", marginBottom: 4 },
  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.texto,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 13,
    color: colors.textoSuave,
    textAlign: "center",
    lineHeight: 19,
  },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.texto,
  },
  errorFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.peligroSuave,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorTexto: { flex: 1, fontSize: 12, color: colors.peligro },
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primario,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botonActivo: { opacity: 0.85 },
  botonTexto: {
    color: colors.textoInvertido,
    fontWeight: "800",
    fontSize: 15,
  },
  aviso: {
    fontSize: 11,
    color: colors.textoMuySuave,
    textAlign: "center",
    lineHeight: 16,
  },
  yaLogueado: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  yaLogueadoTexto: {
    fontSize: 13,
    color: colors.textoSuave,
    textAlign: "center",
    lineHeight: 19,
  },
  botonVolver: {
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  botonVolverTexto: { color: colors.texto, fontWeight: "700", fontSize: 14 },
});
