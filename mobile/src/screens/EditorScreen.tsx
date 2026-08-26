import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";

import { ToolbarEditor } from "../components/excel/ToolbarEditor";
import { HandsontableGrid } from "../components/excel/HandsontableGrid";
import { Banner } from "../components/ui";
import { useEditorStore } from "../state/editorStore";
import { colors } from "../theme";

export function EditorScreen() {
  const cargar = useEditorStore((s) => s.cargar);
  const cargando = useEditorStore((s) => s.cargando);
  const error = useEditorStore((s) => s.error);
  const flash = useEditorStore((s) => s.flash);
  const limpiarFlash = useEditorStore((s) => s.limpiarFlash);

  const filas = useEditorStore((s) => s.filas);
  const anio = useEditorStore((s) => s.anio);
  const mes = useEditorStore((s) => s.mes);

  // Funciones de store
  const setCelda = useEditorStore((s) => s.setCelda);
  const deshacer = useEditorStore((s) => s.deshacer);
  const rehacer = useEditorStore((s) => s.rehacer);
  const eliminarFilasPorId = useEditorStore((s) => s.eliminarFilasPorId);
  const eliminarColumna = useEditorStore((s) => s.eliminarColumna);

  const filasFiltradas = useMemo(() => {
    return filas.filter((f) => {
      if (!f.Fecha) return false;
      const [yyyy, mm] = f.Fecha.split("-");
      if (anio != null && parseInt(yyyy, 10) !== anio) return false;
      return mes == null || parseInt(mm, 10) === mes;
    });
  }, [filas, anio, mes]);

  // Atajos de teclado globales (Solo para Web / Escritorio)
  useEffect(() => {
    if (Platform.OS === "web") {
      const manejarTeclado = (e: KeyboardEvent) => {
        // Ignorar si el usuario está escribiendo dentro de un input nativo fuera de la tabla
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        if (e.ctrlKey || e.metaKey) {
          if (e.key.toLowerCase() === "z") {
            e.preventDefault();
            if (e.shiftKey) {
              rehacer();
            } else {
              deshacer();
            }
          } else if (e.key.toLowerCase() === "y") {
            e.preventDefault();
            rehacer();
          }
        }
      };

      window.addEventListener("keydown", manejarTeclado);
      return () => window.removeEventListener("keydown", manejarTeclado);
    }
  }, [deshacer, rehacer]);

  useFocusEffect(
    useCallback(() => {
      // Solo cargamos si el store sigue en su estado inicial "cargando"
      if (useEditorStore.getState().cargando) {
        void cargar();
      }
    }, [cargar]),
  );

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(limpiarFlash, 4500);
    return () => clearTimeout(timer);
  }, [flash, limpiarFlash]);

  return (
    <View style={styles.pantalla}>
      <View style={styles.contenido}>
        {/* ENVOLTORIO CLAVE PARA EL Z-INDEX */}
        <View style={styles.toolbarContainer}>
          <ToolbarEditor />
        </View>

        {flash ? (
          <Banner
            tono={
              flash.tipo === "ok"
                ? "exito"
                : flash.tipo === "error"
                  ? "peligro"
                  : "info"
            }
            texto={flash.texto}
          />
        ) : null}

        {error ? (
          <Banner tono="peligro" texto={`Error al cargar el Excel: ${error}`} />
        ) : null}

        {cargando ? (
          <View style={styles.centrado}>
            <Text style={styles.cargandoTexto}>Cargando datos...</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            <HandsontableGrid
              datos={filasFiltradas}
              onCellChange={(id, columna, nuevoValor) => {
                setCelda(id, columna, nuevoValor);
              }}
              onRowsRemove={(ids) => {
                eliminarFilasPorId(ids);
              }}
              onColumnRemove={(columnas) => {
                const colsArray = Array.isArray(columnas)
                  ? columnas
                  : [columnas];
                colsArray.forEach((col) => {
                  eliminarColumna(col);
                });
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flex: 1, padding: 10, paddingBottom: 0 },
  toolbarContainer: { zIndex: 9999, elevation: 9999 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center" },
  cargandoTexto: { fontSize: 13, color: colors.textoSuave },
  gridContainer: {
    flex: 1,
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
    elevation: 2,
    zIndex: 1,
  },
});
