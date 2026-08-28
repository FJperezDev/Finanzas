import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fmtEur, fmtEurSigno } from "./formatos";
import { normalizarImporte } from "./xlsxCompartido";

describe("fmtEur", () => {
  it("muestra siempre dos decimales", () => {
    assert.equal(fmtEur(0), "0,00 €");
    assert.equal(fmtEur(1234.5), "1.234,50 €");
    assert.equal(fmtEur(-98.9), "-98,90 €");
  });
});

describe("fmtEurSigno", () => {
  it("muestra signo y dos decimales", () => {
    assert.equal(fmtEurSigno(800), "+800,00 €");
    assert.equal(fmtEurSigno(-1200.5), "−1.200,50 €");
  });
});

describe("normalizarImporte", () => {
  it("acepta el formato español", () => {
    assert.equal(normalizarImporte("1.234,56"), 1234.56);
    assert.equal(normalizarImporte("800"), 800);
    assert.equal(normalizarImporte("12,5"), 12.5);
  });

  it("acepta el formato anglosajón", () => {
    assert.equal(normalizarImporte("1,234.56"), 1234.56);
    assert.equal(normalizarImporte("98.90"), 98.9);
  });

  it("devuelve números tal cual y 0 ante valores inválidos", () => {
    assert.equal(normalizarImporte(1234.56), 1234.56);
    assert.equal(normalizarImporte("abc"), 0);
    assert.equal(normalizarImporte(null), 0);
  });
});
