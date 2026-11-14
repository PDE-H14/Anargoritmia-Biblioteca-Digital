import React, { forwardRef, useLayoutEffect, useRef } from "react";
import { expresionDe, resaltar } from "../../../../components/Notes/resaltado";

/*
 * Pozo de código del taller: textarea con números de línea y resaltado.
 *
 * Técnica: debajo del textarea (texto transparente, cursor visible) hay un
 * «espejo» con las mismas medidas que pinta cada línea lógica con su número
 * y las palabras clave en color. Como ambos ajustan las líneas igual, los
 * números quedan alineados aunque una línea larga ocupe varias visuales.
 */

// Cuatro espacios: sirven para código y para anidar listas de Markdown,
// tanto con viñetas («- ») como numeradas («1. »).
const SANGRIA = "    ";

/**
 * Líneas que toca la selección [ini, fin): desde el inicio de la línea de
 * `ini` hasta el final de la de `fin`. Si la selección termina justo al
 * principio de una línea, esa línea no cuenta (como en los editores de código).
 */
function lineasSeleccionadas(texto, ini, fin) {
  const desde = texto.lastIndexOf("\n", ini - 1) + 1;
  const ultimo = fin > ini && texto[fin - 1] === "\n" ? fin - 1 : fin;
  const finLinea = texto.indexOf("\n", ultimo);
  return { desde, hasta: finLinea === -1 ? texto.length : finLinea };
}

/** Tab: un cursor o una selección en una línea recibe la sangría; varias líneas se sangran todas. */
function ponerSangria(texto, ini, fin) {
  if (!texto.slice(ini, fin).includes("\n")) {
    const nuevo = texto.slice(0, ini) + SANGRIA + texto.slice(fin);
    return { texto: nuevo, ini: ini + SANGRIA.length, fin: ini + SANGRIA.length };
  }
  const { desde, hasta } = lineasSeleccionadas(texto, ini, fin);
  const lineas = texto.slice(desde, hasta).split("\n");
  const bloque = lineas.map((l) => SANGRIA + l).join("\n");
  return {
    texto: texto.slice(0, desde) + bloque + texto.slice(hasta),
    ini: ini + SANGRIA.length,
    fin: fin + SANGRIA.length * lineas.length,
  };
}

/** Shift+Tab: quita hasta cuatro espacios del inicio de cada línea tocada. */
function quitarSangria(texto, ini, fin) {
  const { desde, hasta } = lineasSeleccionadas(texto, ini, fin);
  const lineas = texto.slice(desde, hasta).split("\n");
  const quitados = lineas.map((l) => l.match(/^ {0,4}/)[0].length);
  const bloque = lineas.map((l, i) => l.slice(quitados[i])).join("\n");
  const total = quitados.reduce((a, b) => a + b, 0);
  return {
    texto: texto.slice(0, desde) + bloque + texto.slice(hasta),
    ini: Math.max(desde, ini - quitados[0]),
    fin: Math.max(desde, fin - total),
  };
}

/**
 * - `lenguaje`: activa el resaltado de palabras clave (texto Markdown: null).
 * - `sangrar`: Tab sangra y Shift+Tab quita sangría (en todas las líneas
 *   seleccionadas). Esc libera el foco para que el siguiente Tab salga del
 *   editor (no se atrapa al teclado).
 * - `onSiguiente`: Shift+Enter, como «ejecutar celda» en un cuaderno.
 */
export const PozoCodigo = forwardRef(function PozoCodigo(
  { valor, onCambio, lenguaje = null, sangrar = false, etiqueta, placeholder, onSiguiente },
  ref,
) {
  const liberado = useRef(false);
  // Selección que debe quedar tras sangrar; se aplica cuando React ya puso el
  // texto nuevo en el textarea (si se aplicara antes, el cursor saltaría al final).
  const seleccion = useRef(null);
  const expresion = expresionDe(lenguaje);
  const lineas = valor.split("\n");

  useLayoutEffect(() => {
    const pendiente = seleccion.current;
    if (!pendiente) return;
    seleccion.current = null;
    pendiente.el.setSelectionRange(pendiente.ini, pendiente.fin);
  }, [valor]);

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
    if (e.key === "Tab" && sangrar && !liberado.current) {
      e.preventDefault();
      const el = e.target;
      const { selectionStart, selectionEnd } = el;
      const cambio = (e.shiftKey ? quitarSangria : ponerSangria)(valor, selectionStart, selectionEnd);
      if (cambio.texto === valor) return; // Shift+Tab sin sangría que quitar
      seleccion.current = { el, ini: cambio.ini, fin: cambio.fin };
      onCambio(cambio.texto);
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
