import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ModalAnadirColumna } from "./ModalAnadirColumna";
import { ModalAnadirMovimiento } from "./ModalAnadirMovimiento";
import { exportarXlsx } from "../../core/xlsxService";
import { aniosDisponibles, useEditorStore } from "../../state/editorStore";
import { colors } from "../../theme";
import { MESES_ES } from "../../core/config";

// --- Botón exclusivo para iconos ---
function BotonIcono({
  icono,
  onPress,
  primario,
}: {
  icono: any;
  onPress: () => void;
  primario?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        primario ? styles.btnIconoPrimario : styles.btnIconoSecundario,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons
        name={icono}
        size={primario ? 22 : 18}
        color={primario ? "#ffffff" : colors.texto}
      />
    </Pressable>
  );
}

// --- Selector Desplegable (Año / Mes) ---
function Desplegable({
  etiqueta,
  opciones,
  valor,
  onElegir,
  icono,
  claveActiva,
}: any) {
  const [abierto, setAbierto] = useState(false);
  return (
    <View style={[styles.desplegableContenedor, { zIndex: abierto ? 100 : 1 }]}>
      <Pressable
        style={({ pressed }) => [
          styles.desplegableCabecera,
          pressed && { opacity: 0.7, backgroundColor: colors.fondo },
          abierto && { borderColor: colors.primario },
        ]}
        onPress={() => setAbierto(true)}
      >
        <View style={styles.desplegableIconoFondo}>
          <Ionicons name={icono} size={14} color={colors.primario} />
        </View>
        <View style={styles.desplegableTextos}>
          <Text style={styles.desplegableEtiqueta}>{etiqueta}</Text>
          <Text style={styles.desplegableValor} numberOfLines={1}>
            {valor}
          </Text>
        </View>
        <Ionicons
          name={abierto ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textoSuave}
        />
      </Pressable>
      {abierto && (
        <>
          <Pressable
            style={styles.pantallaCompletaHabilitador}
            onPress={() => setAbierto(false)}
          />
          <View style={styles.menuFlotante}>
            <ScrollView
              style={styles.desplegableLista}
              showsVerticalScrollIndicator={false}
            >
              {opciones.map((opcion: any) => {
                const activo =
                  opcion.clave === (claveActiva != null ? claveActiva : valor);
                return (
                  <Pressable
                    key={opcion.clave}
                    style={[
                      styles.desplegableOpcion,
                      activo && styles.desplegableOpcionActiva,
                    ]}
                    onPress={() => {
                      onElegir(opcion.clave);
                      setAbierto(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.desplegableOpcionTexto,
                        activo && styles.desplegableOpcionTextoActiva,
                      ]}
                    >
                      {opcion.texto}
                    </Text>
                    {activo && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primario}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

// --- Indicador de estado del autoguardado ---
function IndicadorGuardado() {
  const sucio = useEditorStore((s) => s.sucio);
  const guardando = useEditorStore((s) => s.guardando);

  const texto = guardando
    ? "Guardando…"
    : sucio
      ? "Cambios sin guardar"
      : "Guardado";
  const icono = guardando
    ? "sync"
    : sucio
      ? "cloud-upload-outline"
      : "checkmark-circle";
  const color = guardando
    ? colors.textoSuave
    : sucio
      ? colors.aviso
      : colors.exito;

  return (
    <View style={styles.indicadorGuardado}>
      <Ionicons name={icono} size={15} color={color} />
      <Text style={[styles.indicadorGuardadoTexto, { color }]}>{texto}</Text>
    </View>
  );
}

// --- Switch Vista ---
function SwitchVista() {
  const modoVista = useEditorStore((s) => s.modoVista);
  const setModoVista = useEditorStore((s) => s.setModoVista);

  return (
    <View style={styles.switchVista}>
      <Pressable
        onPress={() => setModoVista("movimientos")}
        style={[
          styles.switchOpcion,
          modoVista === "movimientos" && styles.switchOpcionActiva,
        ]}
      >
        <Ionicons
          name="list"
          size={14}
          color={modoVista === "movimientos" ? "#fff" : colors.textoSuave}
        />
        <Text
          style={[
            styles.switchTexto,
            modoVista === "movimientos" && styles.switchTextoActivo,
          ]}
        >
          Movimientos
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setModoVista("traspasos")}
        style={[
          styles.switchOpcion,
          modoVista === "traspasos" && styles.switchOpcionActiva,
        ]}
      >
        <Ionicons
          name="swap-horizontal"
          size={14}
          color={modoVista === "traspasos" ? "#fff" : colors.textoSuave}
        />
        <Text
          style={[
            styles.switchTexto,
            modoVista === "traspasos" && styles.switchTextoActivo,
          ]}
        >
          Traspasos
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Barra de herramientas principal
// ---------------------------------------------------------------------------
export function ToolbarEditor() {
  const { width } = useWindowDimensions();
  const esDesktop = width > 768;

  const filas = useEditorStore((s) => s.filas);
  const anio = useEditorStore((s) => s.anio);
  const mes = useEditorStore((s) => s.mes);
  const setAnio = useEditorStore((s) => s.setAnio);
  const setMes = useEditorStore((s) => s.setMes);
  const filasSeleccionadas = useEditorStore((s) => s.filasSeleccionadas);
  const eliminarFilasSeleccionadas = useEditorStore(
    (s) => s.eliminarFilasSeleccionadas,
  );

  const [modalColumna, setModalColumna] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);

  const opcionesAnio = [
    { clave: "T", texto: "Todos los años" },
    ...aniosDisponibles(filas).map((a) => ({
      clave: String(a),
      texto: `Año ${a}`,
    })),
  ];
  const opcionesMes = [
    { clave: "T", texto: "Todos los meses" },
    ...MESES_ES.map((nombre, i) => ({
      clave: String(i + 1),
      texto: `${nombre}`,
    })),
  ];

  return (
    <View style={styles.contenedorPrincipal}>
      <View style={styles.filaPrincipal}>
        {/* GRUPO 1: Se le asigna un zIndex superior (100) para que el menú flote por encima del resto */}
        <View style={[styles.grupoBotones, { zIndex: 100 }]}>
          <BotonIcono
            icono="add"
            onPress={() => setModalMovimiento(true)}
            primario
          />
          <Desplegable
            icono="calendar-outline"
            etiqueta="Año"
            opciones={opcionesAnio}
            valor={anio == null ? "Todos los años" : `${anio}`}
            claveActiva={anio == null ? "T" : String(anio)}
            onElegir={(clave: any) =>
              setAnio(clave === "T" ? null : Number(clave))
            }
          />
          <Desplegable
            icono="filter-outline"
            etiqueta="Mes"
            opciones={opcionesMes}
            valor={mes == null ? "Todos los meses" : MESES_ES[mes - 1]}
            claveActiva={mes == null ? "T" : String(mes)}
            onElegir={(clave: any) =>
              setMes(clave === "T" ? null : Number(clave))
            }
          />
        </View>

        {/* GRUPO 2: zIndex inferior (1) */}
        <View
          style={[
            styles.grupoBotones,
            { zIndex: 1 },
            esDesktop && { flex: 1, justifyContent: "space-between" },
          ]}
        >
          <SwitchVista />
          {esDesktop && <View style={{ flex: 1 }} />}
          <IndicadorGuardado />
        </View>
      </View>

      <View style={styles.filaSecundaria}>
        <BotonIcono icono="options" onPress={() => setModalColumna(true)} />
        {Platform.OS === "web" && (
          <BotonIcono
            icono="download"
            onPress={() => exportarXlsx(anio, mes)}
          />
        )}
        {filasSeleccionadas.length > 0 && (
          <BotonIcono icono="trash" onPress={eliminarFilasSeleccionadas} />
        )}
      </View>

      <ModalAnadirMovimiento
        visible={modalMovimiento}
        onCerrar={() => setModalMovimiento(false)}
      />
      <ModalAnadirColumna
        visible={modalColumna}
        onCerrar={() => setModalColumna(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorPrincipal: { gap: 10, marginBottom: 8 },

  filaPrincipal: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    zIndex: 10,
    flexWrap: "wrap",
  },
  grupoBotones: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  switchVista: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.tarjeta,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 12,
    padding: 3,
    height: 44,
  },
  switchOpcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  switchOpcionActiva: { backgroundColor: colors.primario },
  switchTexto: { fontSize: 12, fontWeight: "600", color: colors.textoSuave },
  switchTextoActivo: { color: "#fff", fontWeight: "700" },

  btnIconoPrimario: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primario,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primario,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  btnIconoSecundario: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    justifyContent: "center",
    alignItems: "center",
  },

  indicadorGuardado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.tarjeta,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
  },
  indicadorGuardadoTexto: { fontSize: 12, fontWeight: "600" },

  desplegableContenedor: { width: 140, position: "relative" },
  desplegableCabecera: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.tarjeta,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    height: 44,
  },
  desplegableIconoFondo: {
    backgroundColor: colors.primarioSuave,
    padding: 6,
    borderRadius: 8,
  },
  desplegableTextos: { flex: 1, justifyContent: "center" },
  desplegableEtiqueta: {
    fontSize: 9,
    color: colors.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  desplegableValor: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.texto,
    marginTop: 1,
  },

  pantallaCompletaHabilitador: {
    position: "absolute",
    top: -5000,
    left: -5000,
    right: -5000,
    bottom: -5000,
    zIndex: 90,
  },
  menuFlotante: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: colors.tarjeta,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 100,
  },
  desplegableLista: { maxHeight: 220 },
  desplegableOpcion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.fondo,
  },
  desplegableOpcionActiva: { backgroundColor: colors.fondo },
  desplegableOpcionTexto: {
    fontSize: 14,
    color: colors.texto,
    fontWeight: "500",
  },
  desplegableOpcionTextoActiva: { color: colors.primario, fontWeight: "700" },

  filaSecundaria: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    zIndex: 1,
  },
});
