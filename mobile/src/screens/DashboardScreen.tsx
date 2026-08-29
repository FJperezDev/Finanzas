import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";

import { BarrasComparativa } from "../components/charts/BarrasComparativa";
import { DonutDistribucion } from "../components/charts/DonutDistribucion";
import { FlujoChart } from "../components/charts/FlujoChart";
import { ContactosModal } from "../components/ContactosModal";
import { TarjetaPilar } from "../components/charts/TarjetaPilar";
import {
  SelectorAlcance,
  SelectorAnios,
  SelectorPeriodos,
  type Alcance,
} from "../components/SelectorPeriodos";
import {
  Banner,
  BarraProgreso,
  Metrica,
  Tarjeta,
  TituloSeccion,
} from "../components/ui";
import {
  distribucion503020,
  esTransferenciaInversion,
  flujoDeCajaMensual,
  patrimonioAcumulado,
  type BalanceContacto, // Importamos el tipo para el estado
} from "../core/calculations";
import { UMBRAL_FIJOS_ALERTA } from "../core/config";
import {
  etiquetaPeriodo,
  fmtEur,
  fmtEurSigno,
  fmtPct,
  nombreMes,
} from "../core/formatos";
import { useTransacciones, useDeudas } from "../hooks/useTransacciones";
import { colors } from "../theme";

export function DashboardScreen() {
  const { cargando, error, filas } = useTransacciones();
  const { balances, cargando: cargandoDeudas } = useDeudas();
  const { width } = useWindowDimensions();
  const esDesktop = width > 768;

  const [modalContactosVisible, setModalContactosVisible] = useState(false);

  // Estado para saber qué deuda hemos tocado para saldarla
  const [deudaSeleccionada, setDeudaSeleccionada] =
    useState<BalanceContacto | null>(null);

  const periodos = useMemo(() => {
    const set = new Set<string>();
    for (const f of filas) {
      const m = /^(\d{4})-(\d{2})/.exec(f.Fecha);
      if (m) set.add(`${m[1]}-${m[2]}`);
    }
    return [...set].sort();
  }, [filas]);

  const anios = useMemo(
    () =>
      [...new Set(periodos.map((p) => Number(p.slice(0, 4))))].sort(
        (a, b) => a - b,
      ),
    [periodos],
  );

  const [alcance, setAlcance] = useState<Alcance>("mes");
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);

  const periodoActivo = periodo ?? periodos[periodos.length - 1] ?? null;
  const anioActivo = anioSeleccionado ?? anios[anios.length - 1] ?? null;

  const dfAlcance = useMemo(() => {
    if (alcance === "mes")
      return filas.filter((f) => f.Fecha.startsWith(periodoActivo ?? "____"));
    if (alcance === "anio")
      return filas.filter((f) =>
        f.Fecha.startsWith(String(anioActivo ?? "____")),
      );
    return filas;
  }, [filas, alcance, periodoActivo, anioActivo]);

  const limiteAlcance = useMemo(() => {
    if (alcance === "mes" && periodoActivo) return `${periodoActivo}-31`;
    if (alcance === "anio" && anioActivo != null) return `${anioActivo}-12-31`;
    return null;
  }, [alcance, periodoActivo, anioActivo]);

  const dfHasta = useMemo(
    () =>
      limiteAlcance == null
        ? filas
        : filas.filter((f) => f.Fecha <= limiteAlcance),
    [filas, limiteAlcance],
  );

  const kpis = useMemo(() => {
    let ingresos = 0,
      gastos = 0,
      fijo = 0,
      ocio = 0;
    const meses = new Set<string>();

    for (const f of dfAlcance) {
      meses.add(f.Fecha.slice(0, 7));
      if (f.Tipo === "Ingreso") ingresos += f.Importe;
      else if (f.Tipo === "Gasto" && !esTransferenciaInversion(f)) {
        gastos += f.Importe;
        if (f.Categoria_Macro === "Fijo") fijo += f.Importe;
        else if (f.Categoria_Macro === "Ocio") ocio += f.Importe;
      }
    }

    const flujoNeto = ingresos - gastos;
    const tasaAhorro = ingresos > 0 ? (ingresos - fijo - ocio) / ingresos : NaN;
    const ratioFijos = ingresos > 0 ? fijo / ingresos : 0;

    return {
      ingresos,
      gastos,
      fijo,
      ocio,
      flujoNeto,
      tasaAhorro,
      ratioFijos,
      meses: Math.max(meses.size, 1),
      movimientos: dfAlcance.length,
    };
  }, [dfAlcance]);

  const patrimonio = useMemo(() => {
    const p = patrimonioAcumulado(dfHasta);
    return {
      aportadoMyInvestor: p.aportadoCartera,
      aportadoTradeRepublic: p.aportadoRemunerada,
      balanceCorriente: p.balanceCorriente,
      totalActual: p.totalPatrimonio,
    };
  }, [dfHasta]);

  const resumenDeudas = useMemo(() => {
    const deudores = balances
      .filter((b) => b.balanceNeto !== 0)
      .sort((a, b) => b.balanceNeto - a.balanceNeto);
    const balanceGlobal = deudores.reduce((acc, b) => acc + b.balanceNeto, 0);
    const liquidezProyectada = patrimonio.balanceCorriente + balanceGlobal;
    return { deudores, balanceGlobal, liquidezProyectada };
  }, [balances, patrimonio.balanceCorriente]);

  const distribucion = useMemo(() => {
    const gastos = dfAlcance.filter((f) => f.Tipo === "Gasto");
    const ingresosTotales = dfAlcance
      .filter((f) => f.Tipo === "Ingreso")
      .reduce((acc, f) => acc + f.Importe, 0);
    return distribucion503020(gastos, ingresosTotales);
  }, [dfAlcance]);

  const { datosFlujo, destacadaFlujo } = useMemo(() => {
    const base = alcance === "mes" ? filas : dfAlcance;
    const destacada =
      alcance === "mes" && periodoActivo
        ? etiquetaPeriodo(
            Number(periodoActivo.slice(0, 4)),
            Number(periodoActivo.slice(5, 7)),
          )
        : null;
    return {
      datosFlujo: flujoDeCajaMensual(base).map((m) => ({
        etiqueta: m.etiqueta,
        ingresos: m.Ingresos,
        gastos: m.Gastos,
        neto: m.Neto,
      })),
      destacadaFlujo: destacada,
    };
  }, [alcance, filas, dfAlcance, periodoActivo]);

  const etiquetaMes = periodoActivo
    ? `${nombreMes(Number(periodoActivo.slice(5, 7)))} ${periodoActivo.slice(0, 4)}`
    : "—";
  const etiquetaHero =
    alcance === "mes" && periodoActivo
      ? `Patrimonio a final de ${etiquetaMes}`
      : alcance === "anio" && anioActivo != null
        ? `Patrimonio a final de ${anioActivo}`
        : "Patrimonio Neto Total";
  const tituloFlujo =
    alcance === "mes"
      ? `Flujo Mensual: ${etiquetaMes}`
      : alcance === "anio"
        ? `Resumen Anual ${anioActivo}`
        : "Resumen Histórico";
  const tituloDistribucion =
    alcance === "anio"
      ? `Distribución 50/30/20 · ${anioActivo}`
      : alcance === "mes" && periodoActivo
        ? `Distribución 50/30/20 · ${etiquetaMes}`
        : "Distribución 50/30/20";
  const tituloHistorico =
    alcance === "anio"
      ? `Histórico de Caja · ${anioActivo}`
      : "Histórico de Caja";
  const textoVacio =
    alcance === "mes"
      ? "Aún no hay transacciones en este mes."
      : alcance === "anio"
        ? `Aún no hay transacciones en ${anioActivo}.`
        : "Aún no hay transacciones en tu histórico.";
  const resumenAlcance =
    alcance === "mes"
      ? `${kpis.movimientos} movimientos`
      : `${kpis.movimientos} movimientos · ${kpis.meses} meses`;

  const getResumenInsight = () => {
    const contexto =
      alcance === "mes"
        ? "este mes"
        : alcance === "anio"
          ? "este año"
          : "en tu histórico";
    if (kpis.flujoNeto < 0)
      return {
        tono: "peligro" as const,
        texto: `Estás en números rojos ${contexto}. Revisa los gastos.`,
      };
    if (kpis.tasaAhorro >= 0.2)
      return {
        tono: "exito" as const,
        texto: `¡Excelente! Tasa de ahorro del ${fmtPct(kpis.tasaAhorro)} ${contexto}.`,
      };
    if (kpis.tasaAhorro > 0)
      return {
        tono: "info" as const,
        texto: `Ahorrando un ${fmtPct(kpis.tasaAhorro)} ${contexto}. Objetivo: 20%.`,
      };
    return {
      tono: "aviso" as const,
      texto: `Sin margen de ahorro ${contexto}.`,
    };
  };

  if (cargando || cargandoDeudas)
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primario} />
        <Text style={[styles.estadoTexto, { marginTop: 12 }]}>
          Cargando transacciones y deudas…
        </Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.pantalla}>
        <Banner tono="peligro" texto={`Error: ${error}`} />
      </View>
    );

  if (filas.length === 0)
    return (
      <View style={styles.centrado}>
        <Ionicons
          name="folder-open-outline"
          size={44}
          color={colors.textoMuySuave}
        />
        <Text style={[styles.estadoTexto, { marginTop: 12 }]}>
          Aún no hay transacciones. Pulsa "Añadir" para empezar.
        </Text>
      </View>
    );

  const insight = getResumenInsight();
  const alcanceVacio = dfAlcance.length === 0;
  const detallePromedio = (valor: number) =>
    alcance === "mes"
      ? undefined
      : `Promedio: ${fmtEur(valor / kpis.meses)}/mes`;

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
    >
      <ContactosModal
        visible={modalContactosVisible}
        onClose={() => setModalContactosVisible(false)}
      />

      {/* MODAL PARA SALDAR DEUDAS */}
      <ModalSaldarDeuda
        balance={deudaSeleccionada}
        onClose={() => setDeudaSeleccionada(null)}
      />

      <SelectorAlcance alcance={alcance} onCambiar={setAlcance} />
      {alcance === "mes" && (
        <SelectorPeriodos
          periodos={periodos}
          seleccionado={periodoActivo}
          onSeleccionar={setPeriodo}
        />
      )}
      {alcance === "anio" && (
        <SelectorAnios
          anios={anios}
          seleccionado={anioActivo}
          onSeleccionar={setAnioSeleccionado}
        />
      )}
      <Text style={styles.resumenAlcance}>{resumenAlcance}</Text>

      {!alcanceVacio && (
        <View style={{ marginBottom: 16 }}>
          <Banner tono={insight.tono} texto={insight.texto} />
        </View>
      )}

      <View style={styles.heroContainer}>
        <Text style={styles.heroEtiqueta}>{etiquetaHero}</Text>
        <View style={styles.heroValorRow}>
          <Text style={styles.heroValor}>{fmtEur(patrimonio.totalActual)}</Text>
        </View>
      </View>

      <View
        style={[styles.gridPilares, esDesktop && styles.gridPilaresDesktop]}
      >
        <TarjetaPilar
          titulo="Liquidez"
          subtitulo="Cuenta Corriente (Operativa)"
          aportado={patrimonio.balanceCorriente}
          valorActual={patrimonio.balanceCorriente}
          icono="water-outline"
          colorAcento={colors.info}
        />
        <TarjetaPilar
          titulo="Crecimiento"
          subtitulo="Fondo indexado · aportado"
          aportado={patrimonio.aportadoMyInvestor}
          valorActual={patrimonio.aportadoMyInvestor}
          icono="rocket-outline"
          colorAcento={colors.primarioFuerte}
        />
        <TarjetaPilar
          titulo="Seguridad"
          subtitulo="Cuenta remunerada · aportado"
          aportado={patrimonio.aportadoTradeRepublic}
          valorActual={patrimonio.aportadoTradeRepublic}
          icono="shield-checkmark-outline"
          colorAcento={colors.exito}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Tarjeta>
          <View style={styles.cabeceraDeudas}>
            <TituloSeccion>Deudas Pendientes</TituloSeccion>
            <TouchableOpacity
              onPress={() => setModalContactosVisible(true)}
              style={{ padding: 4 }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={colors.textoSuave}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.cajaLiquidez}>
            <Text style={styles.txtLiquidez}>
              Liquidez actual:{" "}
              <Text style={{ color: colors.texto }}>
                {fmtEur(patrimonio.balanceCorriente)}
              </Text>
            </Text>
            <Text style={styles.txtLiquidez}>
              Balance tras deudas:{" "}
              <Text
                style={{
                  color:
                    resumenDeudas.balanceGlobal >= 0
                      ? colors.exito
                      : colors.peligro,
                }}
              >
                {fmtEur(resumenDeudas.liquidezProyectada)}
              </Text>
            </Text>
          </View>

          <View style={styles.separador} />

          {resumenDeudas.deudores.length === 0 ? (
            <Text
              style={{
                color: colors.textoSuave,
                fontSize: 14,
                textAlign: "center",
                paddingVertical: 12,
              }}
            >
              ¡Cuentas claras! No tienes deudas pendientes.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {resumenDeudas.deudores.map((b) => (
                <TouchableOpacity
                  key={b.contacto.id}
                  style={styles.filaDeuda}
                  onPress={() => setDeudaSeleccionada(b)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nombreDeuda}>{b.contacto.nombre}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={[
                        styles.valorDeuda,
                        {
                          color:
                            b.balanceNeto > 0 ? colors.exito : colors.peligro,
                        },
                      ]}
                    >
                      {fmtEurSigno(b.balanceNeto)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textoMuySuave}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Tarjeta>
      </View>

      <Tarjeta>
        <TituloSeccion>{tituloFlujo}</TituloSeccion>
        {alcanceVacio ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Ionicons
              name="folder-open-outline"
              size={40}
              color={colors.textoMuySuave}
            />
            <Text
              style={{
                color: colors.textoSuave,
                marginTop: 12,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {textoVacio}
              {"\n"}Pulsa "Añadir" en la cabecera para empezar.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.gridMetricas}>
              <View style={styles.metricaTarjeta}>
                <Metrica
                  etiqueta="Ingresos"
                  valor={fmtEur(kpis.ingresos)}
                  detalle={detallePromedio(kpis.ingresos)}
                />
              </View>
              <View style={styles.metricaTarjeta}>
                <Metrica
                  etiqueta="Gastos"
                  valor={fmtEur(kpis.gastos)}
                  detalle={detallePromedio(kpis.gastos)}
                />
              </View>
              <View style={styles.metricaTarjeta}>
                <Metrica
                  etiqueta="Flujo Neto"
                  valor={fmtEur(kpis.flujoNeto)}
                  tono={
                    kpis.flujoNeto > 0
                      ? "exito"
                      : kpis.flujoNeto < 0
                        ? "peligro"
                        : "aviso"
                  }
                  detalle={detallePromedio(kpis.flujoNeto)}
                />
              </View>
              <View style={styles.metricaTarjeta}>
                <Metrica
                  etiqueta="Tasa Ahorro"
                  valor={
                    Number.isNaN(kpis.tasaAhorro)
                      ? "—"
                      : fmtPct(kpis.tasaAhorro)
                  }
                  tono={kpis.tasaAhorro >= 0.2 ? "exito" : "normal"}
                  detalle="Objetivo: 20%"
                />
              </View>
            </View>
            <View style={styles.separador} />
            <Text style={styles.etiquetaBarra}>
              Presión de Gastos Fijos ({fmtPct(kpis.ratioFijos)})
            </Text>
            <BarraProgreso
              ratio={kpis.ratioFijos / UMBRAL_FIJOS_ALERTA}
              texto={
                kpis.ratioFijos > UMBRAL_FIJOS_ALERTA
                  ? "Superas el umbral seguro"
                  : "Por debajo del umbral"
              }
            />
          </>
        )}
      </Tarjeta>

      {!alcanceVacio && (
        <View
          style={[styles.gridGraficos, esDesktop && styles.gridGraficosDesktop]}
        >
          <View style={[esDesktop && { flex: 1 }]}>
            <Tarjeta style={{ height: "100%" }}>
              <TituloSeccion>{tituloDistribucion}</TituloSeccion>
              <DonutDistribucion
                datos={distribucion.map((d) => ({
                  etiqueta: d.Categoria_Macro,
                  valor: d.Total_Gastado,
                  peso: d.Peso_Real,
                }))}
              />
              <View style={styles.separador} />
              <BarrasComparativa
                datos={distribucion.map((d) => ({
                  etiqueta: d.Categoria_Macro,
                  real: d.Peso_Real,
                  objetivo: d.Peso_Objetivo,
                }))}
              />
            </Tarjeta>
          </View>

          <View style={[esDesktop && { flex: 1 }]}>
            <Tarjeta style={{ height: "100%" }}>
              <TituloSeccion>{tituloHistorico}</TituloSeccion>
              <FlujoChart datos={datosFlujo} destacada={destacadaFlujo} />
            </Tarjeta>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// COMPONENTE: MODAL PARA SALDAR DEUDAS
// ============================================================================
function ModalSaldarDeuda({
  balance,
  onClose,
}: {
  balance: BalanceContacto | null;
  onClose: () => void;
}) {
  const { saldarDeuda } = useDeudas();

  const [cantidad, setCantidad] = useState("");
  const [generarMovimiento, setGenerarMovimiento] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (balance) {
      setCantidad(Math.abs(balance.balanceNeto).toFixed(2));
      setGenerarMovimiento(true); // Checkbox marcado por defecto
    }
  }, [balance]);

  if (!balance) return null;

  const soyDeudor = balance.balanceNeto < 0;

  const handleGuardar = async () => {
    const importe = parseFloat(cantidad.replace(",", "."));
    if (isNaN(importe) || importe <= 0) return;
    setGuardando(true);
    try {
      // El backend salda (total o parcialmente) la deuda con el contacto y,
      // si se pide, registra la transacción espejo. Si no se registra el
      // movimiento, la cantidad se considera "perdonada".
      await saldarDeuda({
        contacto_id: balance.contacto.id,
        importe,
        registrar_transaccion: generarMovimiento,
      });
      onClose();
    } catch (e) {
      // El error ya se gestiona en el store global (flash).
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={!!balance} animationType="fade" transparent>
      <View style={styles.overlayModalSaldar}>
        <View style={styles.cajaModalSaldar}>
          <View style={styles.cabeceraSaldar}>
            <TituloSeccion style={{ marginBottom: 0 }}>
              Saldar Cuentas
            </TituloSeccion>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.textoSuave} />
            </TouchableOpacity>
          </View>

          <Text style={styles.textoInfoSaldar}>
            {soyDeudor
              ? `Le debes a ${balance.contacto.nombre} `
              : `${balance.contacto.nombre} te debe `}
            <Text
              style={{
                color: soyDeudor ? colors.peligro : colors.exito,
                fontWeight: "700",
              }}
            >
              {fmtEur(Math.abs(balance.balanceNeto))}
            </Text>
          </Text>

          <Text style={styles.labelSaldar}>Cantidad a saldar (€)</Text>
          <TextInput
            style={styles.inputSaldar}
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.btnCheckSaldar}
            onPress={() => setGenerarMovimiento(!generarMovimiento)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={generarMovimiento ? "checkbox" : "square-outline"}
              size={22}
              color={generarMovimiento ? colors.primario : colors.textoMuySuave}
            />
            <Text style={styles.txtCheckSaldar}>
              {soyDeudor
                ? "Registrar gasto en mis transacciones"
                : "Registrar ingreso en mis transacciones"}
            </Text>
          </TouchableOpacity>
          {!generarMovimiento && (
            <Text style={styles.txtNotaGasto}>
              Se perdonará la deuda: quedará saldada sin registrar ningún
              movimiento.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.btnConfirmarSaldar,
              { opacity: guardando || !cantidad ? 0.6 : 1 },
            ]}
            onPress={handleGuardar}
            disabled={guardando || !cantidad}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.txtConfirmarSaldar}>Confirmar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================
const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fondo,
    padding: 24,
  },
  estadoTexto: { fontSize: 13, color: colors.textoSuave },
  resumenAlcance: {
    fontSize: 11,
    color: colors.textoMuySuave,
    marginBottom: 12,
  },
  heroContainer: {
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 20,
  },
  heroEtiqueta: {
    fontSize: 14,
    color: colors.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: "center",
  },
  heroValorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroValor: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.texto,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  gridPilares: { flexDirection: "column", gap: 16, marginBottom: 24 },
  gridPilaresDesktop: { flexDirection: "row", alignItems: "stretch" },
  gridMetricas: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 5,
  },
  metricaTarjeta: { width: "50%", paddingHorizontal: 6, marginBottom: 12 },
  separador: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 16,
  },
  etiquetaBarra: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.texto,
    marginBottom: 8,
  },
  cabeceraDeudas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cajaLiquidez: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  txtLiquidez: { fontSize: 13, color: colors.textoSuave, fontWeight: "500" },
  filaDeuda: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.02)",
  },
  nombreDeuda: { fontSize: 15, color: colors.texto, fontWeight: "500" },
  valorDeuda: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  gridGraficos: { flexDirection: "column", gap: 16 },
  gridGraficosDesktop: { flexDirection: "row", alignItems: "stretch" },

  // Estilos Modal Saldar Deudas
  overlayModalSaldar: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cajaModalSaldar: {
    backgroundColor: colors.fondo,
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cabeceraSaldar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  textoInfoSaldar: {
    fontSize: 15,
    color: colors.texto,
    marginBottom: 20,
    textAlign: "center",
  },
  labelSaldar: {
    fontSize: 12,
    color: colors.textoSuave,
    marginBottom: 6,
    fontWeight: "600",
  },
  inputSaldar: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.bordeFuerte,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
    color: colors.texto,
    textAlign: "center",
    marginBottom: 16,
  },
  btnCheckSaldar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  txtCheckSaldar: { fontSize: 13, color: colors.texto, flex: 1 },
  txtNotaGasto: {
    fontSize: 12,
    color: colors.textoSuave,
    fontStyle: "italic",
    marginBottom: 16,
    textAlign: "center",
  },
  btnConfirmarSaldar: {
    backgroundColor: colors.primario,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  txtConfirmarSaldar: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
