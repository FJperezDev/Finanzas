import { Ionicons } from "@expo/vector-icons";
import { DrawerHeaderProps } from "@react-navigation/drawer";
import { getHeaderTitle } from "@react-navigation/elements";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEditorStore } from "../state/editorStore";
import { useAuthStore } from "../state/authStore";
import { colors } from "../theme";
import { MyIcon } from "./MyIcon"; // <-- Importamos tu logo

export function Header({ navigation, route, options }: DrawerHeaderProps) {
  const title = getHeaderTitle(options, route.name);
  const insets = useSafeAreaInsets();

  const setModalVisible = useEditorStore((s) => s.setModalAnadirVisible);
  const errorGlobal = useEditorStore((s) => s.error);
  const hayNotificaciones = errorGlobal !== null;

  const autenticado = useAuthStore((s) => s.estado === "autenticado");
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);

  // Estado para el menú desplegable de los tres puntitos
  const [menuOpcionesVisible, setMenuOpcionesVisible] = useState(false);
  const esDashboard = route.name === "Dashboard";
  const esLogin = route.name === "Login";

  const cerrarMenu = () => setMenuOpcionesVisible(false);

  const manejarCerrarSesion = () => {
    cerrarMenu();
    void cerrarSesion().finally(() => navigation.navigate("Dashboard"));
  };

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <View style={styles.barra}>
        {/* IZQUIERDA: Home / Dashboard (Tu nuevo Logo) */}        <Pressable
          style={({ pressed }) => [
            styles.botonIcono,
            pressed && styles.botonIconoActivo,
          ]}
          onPress={() => navigation.navigate("Dashboard")}
          accessibilityLabel="Ir al Dashboard"
        >
          {/* Contenedor con ancho y alto fijo para que el SVG mantenga proporciones */}
          {esDashboard ? (
            <View style={{ width: 56, height: 28 }}>
              <MyIcon />
            </View>
          ) : (
            <Ionicons name={"pie-chart"} size={26} color={colors.aviso} />
          )}
        </Pressable>

        {/* CENTRO: Título de la sección */}
        <View style={styles.contenedorTitulo}>
          <Text style={styles.titulo} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* DERECHA: Acciones (Notificaciones, Añadir, Opciones) */}
        <View style={styles.contenedorAcciones}>
          {/* 1. Notificaciones */}
          {!esLogin && (
            <Pressable
              style={({ pressed }) => [
                styles.botonIcono,
                pressed && styles.botonIconoActivo,
              ]}
              onPress={() => console.log("Abrir notificaciones")}
            >
              <View>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={hayNotificaciones ? colors.texto : colors.textoSuave}
                />
                {hayNotificaciones && (
                  <View style={styles.indicadorNotificacion} />
                )}
              </View>
            </Pressable>
          )}

          {/* 2. Añadir Movimiento (Minimalista y Píldora) */}
          {!esLogin && (
            <Pressable
              style={({ pressed }) => [
                styles.botonPildora,
                pressed && {
                  opacity: 0.85,
                  transform: [{ scale: 0.98 }],
                },
              ]}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={18} color={colors.textoInvertido} />
              <Text style={styles.textoBotonPildora}>Añadir</Text>
            </Pressable>
          )}

          {/* 3. Opciones Extras (Tres puntitos + Desplegable) */}
          <View style={{ position: "relative" }}>
            <Pressable
              style={({ pressed }) => [
                styles.botonIcono,
                (pressed || menuOpcionesVisible) &&
                  styles.botonIconoActivo,
              ]}
              onPress={() => setMenuOpcionesVisible(true)}
              accessibilityLabel="Opciones extras"
            >
              <Ionicons
                name="ellipsis-vertical"
                size={22}
                color={colors.texto}
              />
            </Pressable>

            {/* Menú Desplegable */}
            {menuOpcionesVisible && (
              <>
                {/* Overlay invisible para cerrar el menú al hacer clic fuera (Web) */}
                {Platform.OS === "web" ? (
                  <Pressable
                    style={styles.overlayWeb}
                    onPress={cerrarMenu}
                  />
                ) : null}

                <View style={styles.dropdown}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      pressed && styles.dropdownItemHover,
                    ]}
                    onPress={() => {
                      cerrarMenu();
                      navigation.navigate("Editor");
                    }}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={colors.texto}
                    />
                    <Text style={styles.dropdownTexto}>Gestionar Excel</Text>
                  </Pressable>

                  <View style={styles.dropdownSeparador} />

                  {autenticado ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        pressed && styles.dropdownItemHover,
                      ]}
                      onPress={manejarCerrarSesion}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={16}
                        color={colors.peligro}
                      />
                      <Text
                        style={[styles.dropdownTexto, { color: colors.peligro }]}
                      >
                        Cerrar sesión
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        pressed && styles.dropdownItemHover,
                      ]}
                      onPress={() => {
                        cerrarMenu();
                        navigation.navigate("Login");
                      }}
                    >
                      <Ionicons
                        name="log-in-outline"
                        size={16}
                        color={colors.exito}
                      />
                      <Text
                        style={[styles.dropdownTexto, { color: colors.exito }]}
                      >
                        Iniciar Sesión
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Aviso persistente: sin sesión, los datos mostrados son de ejemplo. */}
      {!autenticado && !esLogin && (
        <Pressable
          style={styles.bannerDemo}
          onPress={() => navigation.navigate("Login")}
          accessibilityLabel="Iniciar sesión para ver tus datos reales"
        >
          <Ionicons name="flask-outline" size={13} color={colors.aviso} />
          <Text style={styles.bannerDemoTexto}>
            Modo demostración · datos de ejemplo. Inicia sesión para ver tus
            datos reales.
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.fondo,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    zIndex: 100,
  },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 64,
  },

  botonIcono: {
    padding: 8,
    borderRadius: 12,
  },
  botonIconoActivo: {
    backgroundColor: colors.surface0,
  },
  contenedorAcciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contenedorTitulo: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: 8,
  },
  titulo: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.texto,
    letterSpacing: 0.2,
  },

  botonPildora: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primario,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  textoBotonPildora: {
    color: colors.textoInvertido,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  indicadorNotificacion: {
    position: "absolute",
    top: 0,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.peligro,
    borderWidth: 2,
    borderColor: colors.fondo,
  },

  bannerDemo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.avisoSuave,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  bannerDemoTexto: {
    flex: 1,
    fontSize: 11,
    color: colors.aviso,
    fontWeight: "600",
  },

  // --- ESTILOS DEL DROPDOWN ---
  overlayWeb: {
    position: "fixed" as any, // Fijo en toda la ventana del navegador
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    cursor: "default" as any,
    zIndex: 90,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    right: 0,
    width: 180,
    backgroundColor: colors.surface0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    padding: 6,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 10,
  },
  dropdownItemHover: {
    backgroundColor: colors.tarjeta,
  },
  dropdownTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.texto,
  },
  dropdownSeparador: {
    height: 1,
    backgroundColor: colors.borde,
    marginVertical: 4,
  },
});
