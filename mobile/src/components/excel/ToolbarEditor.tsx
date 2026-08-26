import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ModalAnadirColumna } from "./ModalAnadirColumna";
import { ModalAnadirMovimiento } from "./ModalAnadirMovimiento";
import { exportarXlsx } from "../../core/xlsxService";
import { aniosDisponibles, useEditorStore } from "../../state/editorStore";
import { colors } from "../../theme";
import { Boton, ModalCentro } from "../ui";
import {
  MESES_ES,
  TIPOS_PERMITIDOS,
  CATEGORIAS_MACRO,
} from "../../core/config";

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

// ---------------------------------------------------------------------------
// Indicador de estado del autoguardado
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Barra de herramientas principal
// ---------------------------------------------------------------------------
export function ToolbarEditor() {
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
      {/* FILA 1 */}
      <View style={styles.filaPrincipal}>
        <BotonIcono
          icono="add"
          onPress={() => setModalMovimiento(true)}
          primario
        />

        <View style={styles.filtros}>
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

        {/* Este View empuja el indicador de guardado a la derecha */}
        <View style={{ flex: 1 }} />

        {/* ESTADO DEL AUTOGUARDADO (sustituye al botón Guardar) */}
        <IndicadorGuardado />
      </View>

      {/* FILA 2 */}
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
  // --- ESTRUCTURA PRINCIPAL ---
  contenedorPrincipal: { gap: 8, marginBottom: 8 },
  filaPrincipal: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    zIndex: 10,
  },

  filtros: { flexDirection: "row", gap: 12 },

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

  // --- INDICADOR DE ESTADO DEL AUTOGUARDADO ---
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
  indicadorGuardadoTexto: {
    fontSize: 12,
    fontWeight: "600",
  },

  // --- POPOVER DESPLEGABLES ---
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
  },

  // --- FORMULARIO MODALES ---
  formGrid: { gap: 12 },
  formRow: { flexDirection: "row", gap: 12 },
  formCol: { flex: 1, gap: 4 },
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

  modalAyuda: {
    fontSize: 14,
    color: colors.textoSuave,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContenedor: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 6,
  },
  modalInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.texto,
  },
  modalError: {
    fontSize: 12,
    color: colors.peligro,
    marginTop: 4,
    marginLeft: 4,
  },
  divisor: { height: 1, backgroundColor: colors.borde, marginVertical: 20 },
  modalSubtitulo: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
    color: colors.textoSuave,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modalExtrasLista: { gap: 8 },
  modalExtraFila: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fondo,
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  modalExtraIcono: {
    backgroundColor: colors.tarjeta,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  modalExtraNombre: {
    flex: 1,
    fontSize: 15,
    color: colors.texto,
    fontWeight: "600",
  },
  botonEliminarCol: {
    padding: 6,
    backgroundColor: colors.tarjeta,
    borderRadius: 8,
  },
  modalVacio: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12,
  },
  modalSinExtras: {
    fontSize: 14,
    color: colors.textoMuySuave,
    fontWeight: "500",
  },
});
