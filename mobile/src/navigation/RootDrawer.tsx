/** Navegación lateral (drawer): espejo del sidebar de Streamlit. */
import { Ionicons } from "@expo/vector-icons";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Header } from "../components/Header";
import { ModalAnadirMovimiento } from "../components/excel/ModalAnadirMovimiento";
import { DashboardScreen } from "../screens/DashboardScreen";
import { EditorScreen } from "../screens/EditorScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { useEditorStore } from "../state/editorStore";
import { colors } from "../theme";

const Drawer = createDrawerNavigator();

function Icono({
  nombre,
  color,
}: {
  nombre: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return <Ionicons name={nombre} size={19} color={color} />;
}

function ContenidoDrawer(props: any) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>💸 Finanzas Personales</Text>
        <Text style={styles.subtitulo}>
          Arquitectura local sobre transacciones.xlsx
        </Text>
      </View>
      <DrawerItemList {...props} />
      <View style={styles.perfil}>
        <Text style={styles.metricaValor}>25.000,00 €</Text>
        <Text style={styles.metricaEtiqueta}>Salario bruto anual</Text>
        <Text style={styles.perfilTexto}>
          Perfil: House Hacking + Pignoración de fondos
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}

export function RootDrawer() {
  const modalVisible = useEditorStore((s) => s.modalAnadirVisible);
  const setModalVisible = useEditorStore((s) => s.setModalAnadirVisible);
  return (
    <>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        drawerContent={(props) => <ContenidoDrawer {...props} />}
        screenOptions={{
          header: (props) => <Header {...props} />,
          headerStyle: { backgroundColor: colors.tarjeta },
          drawerActiveTintColor: colors.primario,
          drawerActiveBackgroundColor: colors.primarioSuave,
          drawerInactiveTintColor: colors.texto,
          drawerLabelStyle: { fontWeight: "700" },
          drawerStyle: { backgroundColor: colors.tarjeta, width: 300 },
        }}
      >
        <Drawer.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: "Dashboard 50/20/30",
            drawerLabel: "📊 Dashboard 50/20/30",
            drawerIcon: ({ color }) => (
              <Icono nombre="pie-chart-outline" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Editor"
          component={EditorScreen}
          options={{
            title: "Editor de Datos",
            drawerLabel: "🗂️ Editor de Datos",
            drawerIcon: ({ color }) => (
              <Icono nombre="grid-outline" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: "Iniciar sesión",
            drawerLabel: "Iniciar sesión",
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer.Navigator>
      <ModalAnadirMovimiento
        visible={modalVisible}
        onCerrar={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cabecera: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  titulo: { fontSize: 18, fontWeight: "800", color: colors.texto },
  subtitulo: { fontSize: 11, color: colors.textoMuySuave, marginTop: 3 },
  perfil: {
    margin: 12,
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  metricaValor: { fontSize: 22, fontWeight: "800", color: colors.texto },
  metricaEtiqueta: { fontSize: 11, color: colors.textoSuave, marginBottom: 6 },
  perfilTexto: { fontSize: 11, color: colors.textoMuySuave },
});
