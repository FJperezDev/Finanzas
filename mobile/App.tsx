import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MyIcon } from "./src/components/MyIcon";
import { RootDrawer } from "./src/navigation/RootDrawer";
import { useAuthStore } from "./src/state/authStore";
import { colors } from "./src/theme";

export default function App() {
  const estadoSesion = useAuthStore((s) => s.estado);
  const restaurarSesion = useAuthStore((s) => s.restaurarSesion);

  useEffect(() => {
    void restaurarSesion();
  }, [restaurarSesion]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {estadoSesion === "cargando" ? (
          <View style={styles.carga}>
            <View style={styles.logo}>
              <MyIcon />
            </View>
            <ActivityIndicator size="large" color={colors.primario} />
          </View>
        ) : (
          <RootDrawer />
        )}
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  carga: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: colors.fondo,
  },
  logo: { width: 120, height: 60 },
});
