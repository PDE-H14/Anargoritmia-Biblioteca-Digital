import React, { forwardRef, useRef } from "react";

/*
 * Pozo de código del taller: textarea con números de línea y resaltado.
 *
 * Técnica: debajo del textarea (texto transparente, cursor visible) hay un
 * «espejo» con las mismas medidas que pinta cada línea lógica con su número
 * y las palabras clave en color. Como ambos ajustan las líneas igual, los
 * números quedan alineados aunque una línea larga ocupe varias visuales.
 */

const PALABRAS = {
  python: "and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield",
  javascript: "async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null of return super switch this throw true try typeof undefined var void while yield",
  c: "auto break case char const continue default do double else enum extern float for goto if include int long return short signed sizeof static struct switch typedef union unsigned void volatile while define",
  julia: "abstract begin break catch const continue do else elseif end export false finally for function global if import in let local macro module mutable quote return struct true try using where while",
  r: "break else FALSE for function if in Inf NA NaN next NULL repeat return TRUE while library",
};
PALABRAS.cpp = `${PALABRAS.c} bool catch class delete false namespace new nullptr private protected public template this throw true try using virtual`;
PALABRAS.java = "abstract boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true false try void while";
PALABRAS.typescript = `${PALABRAS.javascript} interface type enum implements private public readonly`;

const ALIAS = { py: "python", js: "javascript", ts: "typescript", "c++": "cpp", jl: "julia" };

function expresionDe(lenguaje) {
  if (!lenguaje) return null;
  const clave = lenguaje.toLowerCase().trim().split(/\s+/)[0];
  const lista = PALABRAS[ALIAS[clave] || clave];
  return lista ? new RegExp(`\\b(${lista.split(" ").join("|")})\\b`, "g") : null;
}

function resaltar(linea, expresion) {
  if (!expresion) return linea;
  const partes = [];
  let ultimo = 0;
  linea.replace(expresion, (palabra, _g, indice) => {
    if (indice > ultimo) partes.push(linea.slice(ultimo, indice));
    partes.push(
      <span key={indice} className="pozo__clave">
        {palabra}
      </span>,
    );
    ultimo = indice + palabra.length;
    return palabra;
  });
  partes.push(linea.slice(ultimo));
  return partes;
}

const SANGRIA = "    ";

/**
 * - `lenguaje`: activa el resaltado de palabras clave (texto Markdown: null).
 * - `sangrar`: Tab inserta sangría. Esc libera el foco para que el siguiente
 *   Tab salga del editor (no se atrapa al teclado).
 * - `onSiguiente`: Shift+Enter, como «ejecutar celda» en un cuaderno.
 */
export const PozoCodigo = forwardRef(function PozoCodigo(
  { valor, onCambio, lenguaje = null, sangrar = false, etiqueta, placeholder, onSiguiente },
  ref,
) {
  const liberado = useRef(false);
  const expresion = expresionDe(lenguaje);
  const lineas = valor.split("\n");

  const alTeclear = (e) => {
    if (e.key === "Escape") {
      liberado.current = true;
      return;
    }
    if (e.key === "Enter" && e.shiftKey && onSiguiente) {
      e.preventDefault();
      onSiguiente();
      return;
    }
    if (e.key === "Tab" && sangrar && !e.shiftKey && !liberado.current) {
      e.preventDefault();
      const el = e.target;
      const { selectionStart: ini, selectionEnd: fin } = el;
      onCambio(valor.slice(0, ini) + SANGRIA + valor.slice(fin));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = ini + SANGRIA.length;
      });
      return;
    }
    liberado.current = false;
  };

  return (
    <div className="pozo">
      <div className="pozo__espejo" aria-hidden="true">
        {lineas.map((linea, i) => (
          <div key={i} className="pozo__linea" data-n={i + 1}>
            {resaltar(linea, expresion)}
            {"​"}
          </div>
        ))}
      </div>
      <textarea
        ref={ref}
        className="pozo__editor"
        value={valor}
        aria-label={etiqueta}
        placeholder={placeholder}
        spellCheck={!lenguaje && !sangrar}
        autoCapitalize="off"
        autoComplete="off"
        onChange={(e) => onCambio(e.target.value)}
        onKeyDown={alTeclear}
        onBlur={() => {
          liberado.current = false;
        }}
      />
    </div>
  );
});
