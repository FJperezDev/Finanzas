import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { BarrasComparativa } from "../components/charts/BarrasComparativa";
import { DonutDistribucion } from "../components/charts/DonutDistribucion";
import { FlujoChart } from "../components/charts/FlujoChart";
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
import { distribucion503020, flujoDeCajaMensual } from "../core/calculations";
import { UMBRAL_FIJOS_ALERTA } from "../core/config";
import { etiquetaPeriodo, fmtEur, fmtPct, nombreMes } from "../core/formatos";
import { useTransacciones } from "../hooks/useTransacciones";
import { colors } from "../theme";

export function DashboardScreen() {
  const { cargando, error, filas } = useTransacciones();
  const { width } = useWindowDimensions();
  const esDesktop = width > 768; // Breakpoint para Web

  // -------------------------------------------------------------------------
  // Periodos disponibles y alcance seleccionado (Mes / Año / Todo)
  // -------------------------------------------------------------------------
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

  // Por defecto: el periodo más reciente disponible.
  const periodoActivo = periodo ?? periodos[periodos.length - 1] ?? null;
  const anioActivo = anioSeleccionado ?? anios[anios.length - 1] ?? null;

  // Filas dentro del alcance (mes concreto / año concreto / todo).
  const dfAlcance = useMemo(() => {
    if (alcance === "mes") {
      return filas.filter((f) => f.Fecha.startsWith(periodoActivo ?? "____"));
    }
    if (alcance === "anio") {
      return filas.filter((f) =>
        f.Fecha.startsWith(String(anioActivo ?? "____")),
      );
    }
    return filas;
  }, [filas, alcance, periodoActivo, anioActivo]);

  // Fecha límite del alcance para el patrimonio acumulado.
  const limiteAlcance = useMemo(() => {
    if (alcance === "mes" && periodoActivo) return `${periodoActivo}-31`;
    if (alcance === "anio" && anioActivo != null) return `${anioActivo}-12-31`;
    return null;
  }, [alcance, periodoActivo, anioActivo]);

  // Filas acumuladas hasta el final del alcance (para el hero de patrimonio).
  const dfHasta = useMemo(
    () =>
      limiteAlcance == null
        ? filas
        : filas.filter((f) => f.Fecha <= limiteAlcance),
    [filas, limiteAlcance],
  );

  // -------------------------------------------------------------------------
  // KPIs del alcance
  // -------------------------------------------------------------------------
  const kpis = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    let fijo = 0;
    let ocio = 0;
    const meses = new Set<string>();

    for (const f of dfAlcance) {
      meses.add(f.Fecha.slice(0, 7));
      if (f.Tipo === "Ingreso") ingresos += f.Importe;
      else if (f.Tipo === "Gasto") {
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

  // -------------------------------------------------------------------------
  // Patrimonio acumulado hasta el final del alcance
  // -------------------------------------------------------------------------
  const patrimonio = useMemo(() => {
    let aportadoMyInvestor = 0;
    let aportadoTradeRepublic = 0;
    let totalIngresos = 0;
    let totalGastos = 0;

    for (const f of dfHasta) {
      if (f.Tipo === "Ingreso") {
        totalIngresos += f.Importe;
      } else if (f.Tipo === "Gasto") {
        totalGastos += f.Importe;
        if (f.Categoria_Macro === "Inversión") {
          const sub = (f.Subcategoria || "").toLowerCase();
          if (sub.includes("cartera") || sub.includes("indexada")) {
            aportadoMyInvestor += f.Importe;
          } else if (sub.includes("remunerada")) {
            aportadoTradeRepublic += f.Importe;
          } else totalGastos += f.Importe;
        }
      }
    }

    const balanceCorriente = totalIngresos - totalGastos;
    // Mock temporal para visualización de UI (9% y 2.5%)
    const actualMyInvestor = aportadoMyInvestor * 1.09;
    const actualTradeRepublic = aportadoTradeRepublic * 1.025;

    // CALCULOS HERO
    const totalActual =
      balanceCorriente + actualMyInvestor + actualTradeRepublic;
    const totalAportado =
      balanceCorriente + aportadoMyInvestor + aportadoTradeRepublic;
    const crecimientoGlobal = totalActual - totalAportado;
    const roiGlobal = totalAportado > 0 ? crecimientoGlobal / totalAportado : 0;

    return {
      aportadoMyInvestor,
      actualMyInvestor,
      aportadoTradeRepublic,
      actualTradeRepublic,
      balanceCorriente,
      totalActual,
      crecimientoGlobal,
      roiGlobal,
    };
  }, [dfHasta]);

  // -------------------------------------------------------------------------
  // Distribución 50/30/20 y flujo de caja del alcance
  // -------------------------------------------------------------------------
  const distribucion = useMemo(() => {
    const gastos = dfAlcance.filter((f) => f.Tipo === "Gasto");
    const ingresosTotales = dfAlcance
      .filter((f) => f.Tipo === "Ingreso")
      .reduce((acc, f) => acc + f.Importe, 0);
    return distribucion503020(gastos, ingresosTotales);
  }, [dfAlcance]);

  // En "mes" el gráfico conserva todo el histórico y resalta el mes elegido;
  // en "año"/"todo" muestra exactamente el alcance seleccionado.
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

  // -------------------------------------------------------------------------
  // Etiquetas e insight según el alcance
  // -------------------------------------------------------------------------
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

  // --- ESTADOS DE PANTALLA ---
  if (cargando)
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primario} />
        <Text style={[styles.estadoTexto, { marginTop: 12 }]}>
          Cargando transacciones…
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

      {/* HERO SECTION: PATRIMONIO */}
      <View style={styles.heroContainer}>
        <Text style={styles.heroEtiqueta}>{etiquetaHero}</Text>
        <View style={styles.heroValorRow}>
          <Text style={styles.heroValor}>{fmtEur(patrimonio.totalActual)}</Text>
          {patrimonio.crecimientoGlobal > 0 && (
            <View style={styles.heroBadge}>
              <Ionicons name="caret-up" size={16} color={colors.exito} />
              <Text style={styles.heroBadgeText}>
                +{fmtEur(patrimonio.crecimientoGlobal)} (
                {fmtPct(patrimonio.roiGlobal)})
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* LOS 3 PILARES FINANCIEROS */}
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
          subtitulo="Inversión (9% TAE est.)"
          aportado={patrimonio.aportadoMyInvestor}
          valorActual={patrimonio.actualMyInvestor}
          icono="rocket-outline"
          colorAcento={colors.primarioFuerte}
        />
        <TarjetaPilar
          titulo="Seguridad"
          subtitulo="Remunerada (2.5% TAE)"
          aportado={patrimonio.aportadoTradeRepublic}
          valorActual={patrimonio.actualTradeRepublic}
          icono="shield-checkmark-outline"
          colorAcento={colors.exito}
        />
      </View>

      {/* Tarjeta Resumen del Alcance con Empty State */}
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

      {/* GRAFICOS EN GRID PARA WEB */}
      {!alcanceVacio && (
        <View
          style={[styles.gridGraficos, esDesktop && styles.gridGraficosDesktop]}
        >
          <View style={esDesktop && { flex: 1 }}>
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

          <View style={esDesktop && { flex: 1 }}>
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

  // HERO STYLES
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
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.exitoSuave,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  heroBadgeText: {
    color: colors.exito,
    fontWeight: "800",
    fontSize: 14,
  },

  // PILARES (CONTENEDOR GLOBAL)
  gridPilares: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  gridPilaresDesktop: {
    flexDirection: "row",
    alignItems: "stretch", // Para que tengan el mismo alto
  },

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

  // GRAFICOS
  gridGraficos: { flexDirection: "column", gap: 16 },
  gridGraficosDesktop: { flexDirection: "row", alignItems: "stretch" },
});
