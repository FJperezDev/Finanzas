import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  clasificarInversion,
  esTransferenciaInversion,
  flujoDeCajaMensual,
  patrimonioAcumulado,
  calcularBalancesCruzados,
  type FilaTransaccion,
  type Contacto,
  type GastoCompartido,
} from "./calculations";

function fila(parcial: Partial<FilaTransaccion>): FilaTransaccion {
  return {
    __id: parcial.__id ?? "r1",
    Fecha: parcial.Fecha ?? "2026-01-10",
    Tipo: parcial.Tipo ?? "Gasto",
    Categoria_Macro: parcial.Categoria_Macro ?? "Fijo",
    Subcategoria: parcial.Subcategoria ?? "",
    Concepto: parcial.Concepto ?? "",
    Cuenta: parcial.Cuenta ?? "Unicaja",
    Importe: parcial.Importe ?? 0,
  };
}

describe("clasificarInversion", () => {
  it("clasifica Marca Personal como gasto real", () => {
    assert.equal(clasificarInversion("Marca Personal"), "marca_personal");
    assert.equal(clasificarInversion("Marca_Personal"), "marca_personal");
  });

  it("clasifica la cuenta remunerada como transferencia", () => {
    assert.equal(clasificarInversion("Cuenta_Remunerada"), "remunerada");
    assert.equal(clasificarInversion("cuenta remunerada"), "remunerada");
  });

  it("clasifica el resto como cartera (transferencia por defecto)", () => {
    assert.equal(clasificarInversion("Indexado_SP500"), "cartera");
    assert.equal(clasificarInversion(""), "cartera");
  });
});

describe("esTransferenciaInversion", () => {
  it("es transferencia para inversión no personal", () => {
    assert.ok(
      esTransferenciaInversion(
        fila({
          Tipo: "Gasto",
          Categoria_Macro: "Inversión",
          Subcategoria: "Indexado_SP500",
        }),
      ),
    );
  });

  it("no es transferencia para Marca Personal", () => {
    assert.equal(
      esTransferenciaInversion(
        fila({
          Tipo: "Gasto",
          Categoria_Macro: "Inversión",
          Subcategoria: "Marca Personal",
        }),
      ),
      false,
    );
  });

  it("no es transferencia para gastos corrientes ni ingresos", () => {
    assert.equal(
      esTransferenciaInversion(
        fila({ Tipo: "Gasto", Categoria_Macro: "Fijo" }),
      ),
      false,
    );
    assert.equal(
      esTransferenciaInversion(
        fila({ Tipo: "Ingreso", Categoria_Macro: "Nómina" }),
      ),
      false,
    );
  });
});

describe("patrimonioAcumulado", () => {
  it("resta solo los gastos reales y suma las transferencias como aportado", () => {
    const filas = [
      fila({ Tipo: "Ingreso", Categoria_Macro: "Nómina", Importe: 2500 }),
      fila({ Tipo: "Gasto", Categoria_Macro: "Fijo", Importe: 1150 }),
      fila({
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Indexado_SP500",
        Importe: 800,
      }),
      fila({
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Cuenta_Remunerada",
        Importe: 100,
      }),
      fila({
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Marca Personal",
        Importe: 50,
      }),
    ];

    const p = patrimonioAcumulado(filas);
    assert.equal(p.balanceCorriente, 2500 - 1150 - 800 - 100 - 50);
    assert.equal(p.aportadoCartera, 800);
    assert.equal(p.aportadoRemunerada, 100);
    assert.equal(p.totalPatrimonio, 2500 - 1150 - 50);
  });

  it("no dobla ni pierde el dinero de las transferencias", () => {
    const filas = [
      fila({ Tipo: "Ingreso", Categoria_Macro: "Nómina", Importe: 1000 }),
      fila({
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Indexado_SP500",
        Importe: 800,
      }),
    ];
    const p = patrimonioAcumulado(filas);
    assert.equal(p.balanceCorriente, 200);
    assert.equal(p.totalPatrimonio, 1000);
  });

  it("Marca Personal reduce el patrimonio", () => {
    const filas = [
      fila({ Tipo: "Ingreso", Categoria_Macro: "Nómina", Importe: 1000 }),
      fila({
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Marca Personal",
        Importe: 300,
      }),
    ];
    const p = patrimonioAcumulado(filas);
    assert.equal(p.balanceCorriente, 700);
    assert.equal(p.aportadoCartera, 0);
    assert.equal(p.totalPatrimonio, 700);
  });
});

describe("flujoDeCajaMensual", () => {
  it("excluye las transferencias de los gastos pero incluye Marca Personal", () => {
    const filas = [
      fila({
        Fecha: "2026-01-05",
        Tipo: "Ingreso",
        Categoria_Macro: "Nómina",
        Importe: 2500,
      }),
      fila({
        Fecha: "2026-01-10",
        Tipo: "Gasto",
        Categoria_Macro: "Fijo",
        Importe: 1150,
      }),
      fila({
        Fecha: "2026-01-12",
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Indexado_SP500",
        Importe: 800,
      }),
      fila({
        Fecha: "2026-01-15",
        Tipo: "Gasto",
        Categoria_Macro: "Inversión",
        Subcategoria: "Marca Personal",
        Importe: 60,
      }),
    ];

    const flujo = flujoDeCajaMensual(filas);
    assert.equal(flujo.length, 1);
    assert.equal(flujo[0].Ingresos, 2500);
    assert.equal(flujo[0].Gastos, 1150 + 60);
    assert.equal(flujo[0].Neto, 2500 - 1150 - 60);
  });
});

// --- NUEVOS TESTS DE DEUDAS ---
describe("calcularBalancesCruzados", () => {
  const contactos: Contacto[] = [
    { id: 1, nombre: "Ana", telefono: "111", correo: null, icono: null },
    { id: 2, nombre: "Carlos", telefono: "222", correo: null, icono: null },
  ];

  it("suma a 'meDebe' cuando el pagador soy yo (pagador_id nulo)", () => {
    const gastos: GastoCompartido[] = [
      {
        id: 1,
        concepto: "Cena",
        fecha: "2026-08-20",
        importe_total: 60,
        categoria_macro: "Ocio",
        subcategoria: "Restaurantes",
        tipo_reparto: "IGUALES",
        pagador_id: null,
        participaciones: [
          { contacto_id: 1, importe_debido: 20 },
          { contacto_id: 2, importe_debido: 20 },
        ],
      },
    ];

    const balances = calcularBalancesCruzados(contactos, gastos);
    const ana = balances.find((b) => b.contacto.id === 1)!;

    assert.equal(ana.meDebe, 20);
    assert.equal(ana.leDebo, 0);
    assert.equal(ana.balanceNeto, 20); // Me debe 20€
  });

  it("infiere 'leDebo' al amigo que pagó si el importe total supera al de los participantes", () => {
    const gastos: GastoCompartido[] = [
      {
        id: 2,
        concepto: "Regalo",
        fecha: "2026-08-21",
        importe_total: 100,
        categoria_macro: "Ocio",
        subcategoria: "Restaurantes",
        tipo_reparto: "EXACTO",
        pagador_id: 1, // Pagó Ana
        participaciones: [
          { contacto_id: 2, importe_debido: 40 }, // Carlos debe 40
        ], // Faltan 60€ para los 100€ -> esos me tocan a mí
      },
    ];

    const balances = calcularBalancesCruzados(contactos, gastos);
    const ana = balances.find((b) => b.contacto.id === 1)!;

    assert.equal(ana.meDebe, 0);
    assert.equal(ana.leDebo, 60); // Infiere mi deuda correctamente
    assert.equal(ana.balanceNeto, -60); // Le debo 60€
  });

  it("compensa deudas cruzadas correctamente", () => {
    const gastos: GastoCompartido[] = [
      {
        id: 1,
        concepto: "Pago yo",
        fecha: "2026-08-20",
        importe_total: 50,
        categoria_macro: "Ocio",
        subcategoria: "Restaurantes",
        tipo_reparto: "EXACTO",
        pagador_id: null,
        participaciones: [{ contacto_id: 1, importe_debido: 50 }],
      },
      {
        id: 2,
        concepto: "Paga Ana",
        fecha: "2026-08-21",
        importe_total: 80,
        categoria_macro: "Ocio",
        subcategoria: "Restaurantes",
        tipo_reparto: "EXACTO",
        pagador_id: 1,
        participaciones: [], // No hay más participantes, yo debo los 80€ completos
      },
    ];

    const balances = calcularBalancesCruzados(contactos, gastos);
    const ana = balances.find((b) => b.contacto.id === 1)!;

    assert.equal(ana.meDebe, 50);
    assert.equal(ana.leDebo, 80);
    assert.equal(ana.balanceNeto, -30); // 50 - 80 = -30 (Le sigo debiendo 30€)
  });
});
