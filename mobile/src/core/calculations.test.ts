import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  clasificarInversion,
  esTransferenciaInversion,
  flujoDeCajaMensual,
  patrimonioAcumulado,
  type FilaTransaccion,
} from "./calculations";

function fila(parcial: Partial<FilaTransaccion>): FilaTransaccion {
  return {
    __id: parcial.__id ?? "r1",
    Fecha: parcial.Fecha ?? "2026-01-10",
    Tipo: parcial.Tipo ?? "Gasto",
    Categoria_Macro: parcial.Categoria_Macro ?? "Fijo",
    Subcategoria: parcial.Subcategoria ?? "",
    Concepto: parcial.Concepto ?? "",
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
        fila({ Tipo: "Gasto", Categoria_Macro: "Inversión", Subcategoria: "Indexado_SP500" }),
      ),
    );
  });

  it("no es transferencia para Marca Personal", () => {
    assert.equal(
      esTransferenciaInversion(
        fila({ Tipo: "Gasto", Categoria_Macro: "Inversión", Subcategoria: "Marca Personal" }),
      ),
      false,
    );
  });

  it("no es transferencia para gastos corrientes ni ingresos", () => {
    assert.equal(
      esTransferenciaInversion(fila({ Tipo: "Gasto", Categoria_Macro: "Fijo" })),
      false,
    );
    assert.equal(
      esTransferenciaInversion(fila({ Tipo: "Ingreso", Categoria_Macro: "Nómina" })),
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
    // La cuenta corriente se queda con todo lo no transferido ni gastado.
    assert.equal(p.balanceCorriente, 2500 - 1150 - 800 - 100 - 50);
    assert.equal(p.aportadoCartera, 800);
    assert.equal(p.aportadoRemunerada, 100);
    // El dinero transferido no se pierde: sigue contando en el patrimonio.
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
      fila({ Fecha: "2026-01-05", Tipo: "Ingreso", Categoria_Macro: "Nómina", Importe: 2500 }),
      fila({ Fecha: "2026-01-10", Tipo: "Gasto", Categoria_Macro: "Fijo", Importe: 1150 }),
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
