import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBoxShadow,
  readBorderFromComputed,
  readSurfaceFromComputed,
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
} from "../dist/css/index.js";
import { isVoidElement } from "../dist/dom/index.js";

/** Minimaler Ersatz für CSSStyleDeclaration. */
function styles(values) {
  return {
    getPropertyValue: (property) => values[property] ?? "",
  };
}

test("liest vier Eckradien in Pixeln", () => {
  const radii = resolveRadiusFromComputed(
    styles({
      "border-top-left-radius": "12px",
      "border-top-right-radius": "4px",
      "border-bottom-right-radius": "0px",
      "border-bottom-left-radius": "8px",
    }),
    { width: 200, height: 100 },
  );

  assert.deepEqual(radii, {
    topLeft: 12,
    topRight: 4,
    bottomRight: 0,
    bottomLeft: 8,
  });
});

test("löst Prozentwerte anhand der kürzeren Achse auf", () => {
  const radii = resolveRadiusFromComputed(
    styles({ "border-top-left-radius": "50%" }),
    { width: 200, height: 100 },
  );

  // 50 % von 200 ergeben horizontal 100, vertikal 50. Der Kreis muss in beide Achsen passen.
  assert.equal(radii.topLeft, 50);
});

test("verwendet den einbeschriebenen Kreis elliptischer Ecken", () => {
  const radii = resolveRadiusFromComputed(
    styles({ "border-top-left-radius": "40px 10px" }),
    { width: 200, height: 100 },
  );

  assert.equal(radii.topLeft, 10);
});

test("behandelt fehlende und unlesbare Werte als null", () => {
  const radii = resolveRadiusFromComputed(styles({}), {
    width: 200,
    height: 100,
  });

  assert.deepEqual(radii, {
    topLeft: 0,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0,
  });
});

test("glättet standardmäßig vollständig ohne Erhaltungszwang", () => {
  assert.deepEqual(resolveSmoothingFromComputed(styles({})), {
    smoothing: 1,
    preserveSmoothing: false,
  });
});

test("liest Glättung und Erhaltung aus CSS-Variablen", () => {
  assert.deepEqual(
    resolveSmoothingFromComputed(
      styles({
        "--squircle-smoothing": " 0.6 ",
        "--squircle-preserve-smoothing": "1",
      }),
    ),
    { smoothing: 0.6, preserveSmoothing: true },
  );
});

test("begrenzt die Glättung auf den gültigen Bereich", () => {
  assert.equal(
    resolveSmoothingFromComputed(styles({ "--squircle-smoothing": "5" }))
      .smoothing,
    1,
  );
  assert.equal(
    resolveSmoothingFromComputed(styles({ "--squircle-smoothing": "-2" }))
      .smoothing,
    0,
  );
});

test("liefert bei none keine Schatten", () => {
  assert.deepEqual(parseBoxShadow("none"), []);
  assert.deepEqual(parseBoxShadow(""), []);
});

test("liest einen Schatten mit vier Längen", () => {
  assert.deepEqual(parseBoxShadow("rgba(0, 0, 0, 0.15) 0px 4px 12px 2px"), [
    {
      color: "rgba(0, 0, 0, 0.15)",
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      spread: 2,
    },
  ]);
});

test("ergänzt fehlende Unschärfe und Ausbreitung", () => {
  assert.deepEqual(parseBoxShadow("rgb(0, 0, 0) 1px 2px"), [
    { color: "rgb(0, 0, 0)", offsetX: 1, offsetY: 2, blur: 0, spread: 0 },
  ]);
});

test("trennt Schatten ohne Farbfunktionen zu zerlegen", () => {
  const shadows = parseBoxShadow(
    "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px, rgba(0, 0, 0, 0.2) 0px 8px 24px -4px",
  );

  assert.equal(shadows.length, 2);
  assert.equal(shadows[0].color, "rgba(0, 0, 0, 0.1)");
  assert.equal(shadows[1].offsetY, 8);
  assert.equal(shadows[1].spread, -4);
});

test("überspringt innere Schatten", () => {
  const shadows = parseBoxShadow(
    "rgb(0, 0, 0) 0px 2px 4px 0px inset, rgb(255, 0, 0) 0px 3px 6px 0px",
  );

  assert.equal(shadows.length, 1);
  assert.equal(shadows[0].color, "rgb(255, 0, 0)");
});

test("verarbeitet negative Versätze", () => {
  assert.deepEqual(parseBoxShadow("rgb(0, 0, 0) -2px -4px 8px 0px"), [
    { color: "rgb(0, 0, 0)", offsetX: -2, offsetY: -4, blur: 8, spread: 0 },
  ]);
});

test("erhält moderne CSS-Farbfunktionen in Schatten", () => {
  for (const color of [
    "oklch(40% 0.05 270 / 0.2)",
    "color(display-p3 0.2 0.3 0.4 / 0.5)",
    "hsl(120 20% 30% / 0.4)",
    "color-mix(in oklch, color(display-p3 0.2 0.3 0.4), rgb(0, 0, 0))",
  ]) {
    assert.deepEqual(parseBoxShadow(`${color} 1px -2px 8px 0px`), [
      { color, offsetX: 1, offsetY: -2, blur: 8, spread: 0 },
    ]);
  }
});

test("liest Schatten auch mit nachgestellter Farbe und ohne Farbangabe", () => {
  assert.equal(parseBoxShadow("1px 2px 4px oklch(40% 0 0)")[0].color, "oklch(40% 0 0)");
  assert.equal(parseBoxShadow("1px 2px")[0].color, "currentColor");
  assert.deepEqual(parseBoxShadow("unlesbar"), []);
});

test("liest eine durchgezogene Kontur", () => {
  assert.deepEqual(
    readBorderFromComputed(
      styles({
        "border-top-width": "1.5px",
        "border-top-style": "solid",
        "border-top-color": "rgb(229, 231, 235)",
      }),
    ),
    { width: 1.5, color: "rgb(229, 231, 235)" },
  );
});

test("zeichnet keine nicht unterstützten Konturstile", () => {
  for (const style of ["none", "dashed", "dotted", "double"]) {
    assert.deepEqual(
      readBorderFromComputed(
        styles({
          "border-top-width": "2px",
          "border-top-style": style,
          "border-top-color": "rgb(0, 0, 0)",
        }),
      ),
      { width: 0, color: "rgb(0, 0, 0)" },
      style,
    );
  }
});

test("zeichnet bei Breite null keine Kontur", () => {
  assert.equal(
    readBorderFromComputed(
      styles({ "border-top-width": "0px", "border-top-style": "solid" }),
    ).width,
    0,
  );
});

test("kopiert Hintergrundeigenschaften und Übergänge", () => {
  assert.deepEqual(
    readSurfaceFromComputed(
      styles({
        "background-color": "rgb(25, 45, 115)",
        "background-image": "linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))",
        "background-size": "cover",
        "background-position": "50% 50%",
        "background-repeat": "no-repeat",
        transition: "background-color 150ms ease",
      }),
    ),
    {
      backgroundColor: "rgb(25, 45, 115)",
      backgroundImage: "linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))",
      backgroundSize: "cover",
      backgroundPosition: "50% 50%",
      backgroundRepeat: "no-repeat",
      transition: "background-color 150ms ease",
    },
  );
});

test("nutzt transparente Vorgaben für ungestaltete Elemente", () => {
  assert.deepEqual(readSurfaceFromComputed(styles({})), {
    backgroundColor: "transparent",
    backgroundImage: "none",
    backgroundSize: "auto",
    backgroundPosition: "0% 0%",
    backgroundRepeat: "repeat",
    transition: "none",
  });
});

test("erkennt leere HTML-Elemente", () => {
  for (const tag of ["img", "input", "br", "hr", "IMG", "INPUT"]) {
    assert.equal(isVoidElement(tag), true, tag);
  }
});

test("behandelt Container als nicht leer", () => {
  for (const tag of ["div", "button", "a", "span", "section"]) {
    assert.equal(isVoidElement(tag), false, tag);
  }
});
