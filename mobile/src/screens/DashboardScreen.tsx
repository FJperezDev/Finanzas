import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  TouchableOpacity,
} from "react-native";

import { BarrasComparativa } from "../components/charts/BarrasComparativa";
import { DonutDistribucion } from "../components/charts/DonutDistribucion";
import { FlujoChart } from "../components/charts/FlujoChart";
import { TarjetaPilar } from "../components/charts/TarjetaPilar";
import { ContactosModal } from "../components/ContactosModal";
import { CuentasModal, TraspasoModal } from "../components/CuentasCorrientes";
import { ModalSaldarDeuda } from "../components/dashboard/ModalSaldarDeuda";
import { dashboardStyles as styles } from "../components/dashboard/dashboardStyles";

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
  type BalanceContacto,
  type Cuenta,
} from "../core/calculations";
import { UMBRAL_FIJOS_ALERTA } from "../core/config";
import {
  etiquetaPeriodo,
  fmtEur,
  fmtEurSigno,
  fmtPct,
  nombreMes,
} from "../core/formatos";
import {
  useTransacciones,
  useDeudas,
  useCuentas,
} from "../hooks/useTransacciones";
import { colors } from "../theme";

export function DashboardScreen() {
  const { cargando, error, filas } = useTransacciones();
  const { balances, cargando: cargandoDeudas } = useDeudas();
  const { cuentas } = useCuentas();
  const { width } = useWindowDimensions();
  const esDesktop = width > 768;

  const [modalContactosVisible, setModalContactosVisible] = useState(false);
  const [modalCuentasVisible, setModalCuentasVisible] = useState(false);
  const [traspasoOrigen, setTraspasoOrigen] = useState<Cuenta | null>(null);
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

  const cuentasCorrientes = useMemo(
    () => cuentas.filter((c) => c.tipo === "corriente"),
    [cuentas],
  );
  const liquidezCuentas = useMemo(
    () => cuentasCorrientes.reduce((acc, c) => acc + (c.balance ?? 0), 0),
    [cuentasCorrientes],
  );

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
      <ModalSaldarDeuda
        balance={deudaSeleccionada}
        onClose={() => setDeudaSeleccionada(null)}
      />
      <CuentasModal
        visible={modalCuentasVisible}
        onClose={() => setModalCuentasVisible(false)}
      />
      <TraspasoModal
        cuenta={traspasoOrigen}
        onClose={() => setTraspasoOrigen(null)}
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
          subtitulo="Cuentas Corrientes"
          aportado={liquidezCuentas}
          valorActual={liquidezCuentas}
          icono="water-outline"
          colorAcento={colors.info}
          cuentas={cuentasCorrientes.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            balance: c.balance,
          }))}
          onAgregarCuenta={() => setModalCuentasVisible(true)}
          onCuentaPress={(id) => {
            const cuenta = cuentasCorrientes.find((c) => c.id === id);
            if (cuenta) setTraspasoOrigen(cuenta);
          }}
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
