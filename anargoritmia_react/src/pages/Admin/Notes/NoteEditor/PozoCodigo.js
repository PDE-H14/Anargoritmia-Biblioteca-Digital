import React, { forwardRef, useRef } from "react";
import { expresionDe, resaltar } from "../../../../components/Notes/resaltado";

/*
 * Pozo de código del taller: textarea con números de línea y resaltado.
 *
 * Técnica: debajo del textarea (texto transparente, cursor visible) hay un
 * «espejo» con las mismas medidas que pinta cada línea lógica con su número
 * y las palabras clave en color. Como ambos ajustan las líneas igual, los
 * números quedan alineados aunque una línea larga ocupe varias visuales.
 */

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
            {resaltar(linea, expresion, "pozo__clave")}
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
