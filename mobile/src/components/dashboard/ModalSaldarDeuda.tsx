import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { dashboardStyles as styles } from "./dashboardStyles";
import { TituloSeccion } from "../ui";
import { colors } from "../../theme";
import { fmtEur } from "../../core/formatos";
import type { BalanceContacto } from "../../core/calculations";
import { useDeudas, useCuentas } from "../../hooks/useTransacciones";

export function ModalSaldarDeuda({
  balance,
  onClose,
}: {
  balance: BalanceContacto | null;
  onClose: () => void;
}) {
  const { saldarDeuda } = useDeudas();
  const { cuentas } = useCuentas();
  const cuentasCorrientes = cuentas.filter((c) => c.tipo === "corriente");

  const [cantidad, setCantidad] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [generarMovimiento, setGenerarMovimiento] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (balance) {
      setCantidad(Math.abs(balance.balanceNeto).toFixed(2));
      setGenerarMovimiento(true);
    }
  }, [balance]);

  useEffect(() => {
    if (!cuenta && cuentasCorrientes.length > 0) {
      setCuenta(cuentasCorrientes[0].nombre);
    }
  }, [cuentasCorrientes, cuenta]);

  if (!balance) return null;

  const soyDeudor = balance.balanceNeto < 0;

  const handleGuardar = async () => {
    const importe = parseFloat(cantidad.replace(",", "."));
    if (isNaN(importe) || importe <= 0) return;
    setGuardando(true);
    try {
      await saldarDeuda({
        contacto_id: balance.contacto.id,
        importe,
        registrar_transaccion: generarMovimiento,
        cuenta,
      });
      onClose();
    } catch (e) {
      // El error ya se gestiona en el store global (flash).
    } finally {
      setGuardando(false);
    }
  };

  const importeNum = parseFloat(cantidad.replace(",", "."));
  const exceso =
    !isNaN(importeNum) && importeNum > Math.abs(balance.balanceNeto)
      ? importeNum - Math.abs(balance.balanceNeto)
      : 0;

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
          {generarMovimiento && exceso > 0.01 && (
            <Text style={styles.txtNotaGasto}>
              {soyDeudor
                ? `Supera el saldo: pagas ${fmtEur(exceso)} de más, así que ${balance.contacto.nombre} te deberá ese importe.`
                : `Supera el saldo: ${balance.contacto.nombre} te paga ${fmtEur(exceso)} de más, así que le deberás ese importe.`}
            </Text>
          )}

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

          {generarMovimiento && (
            <>
              <Text style={styles.labelSaldar}>
                {soyDeudor ? "Pagar desde la cuenta" : "Cobrar en la cuenta"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {cuentasCorrientes.map((c) => {
                  const activo = c.nombre === cuenta;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCuenta(c.nombre)}
                      style={[
                        styles.chipCuenta,
                        activo && styles.chipCuentaActivo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipCuentaTexto,
                          activo && styles.chipCuentaTextoActivo,
                        ]}
                      >
                        {c.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
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
