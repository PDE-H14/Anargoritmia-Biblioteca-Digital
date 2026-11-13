import React, { useState } from "react";
import { Icono } from "../../../../components/UI";

// Deben coincidir con MAX_ETIQUETAS y MAX_CARACTERES_ETIQUETA en notas/api/serializers.py
const MAX_ETIQUETAS = 10;
const MAX_CARACTERES = 40;

/**
 * Etiquetas libres de la nota: se escriben y se agregan con Enter o coma.
 * El buscador del catálogo también busca en ellas.
 */
export function EtiquetasNota({ etiquetas, onCambiar }) {
  const [texto, setTexto] = useState("");
  const llenas = etiquetas.length >= MAX_ETIQUETAS;

  const agregar = (escrito = texto) => {
    const nueva = escrito.split(/\s+/).join(" ").trim();
    setTexto("");
    if (!nueva || llenas) return;
    if (etiquetas.some((e) => e.toLowerCase() === nueva.toLowerCase())) return;
    onCambiar([...etiquetas, nueva]);
  };

  return (
    <div className="campo etiquetas-nota">
      <label className="campo__etiqueta" htmlFor="nota-etiquetas">
        Etiquetas
      </label>
      {etiquetas.length > 0 && (
        <ul className="selector-categorias__fichas" aria-label="Etiquetas de la nota">
          {etiquetas.map((e) => (
            <li key={e}>
              <span>#{e}</span>
              <button
                type="button"
                aria-label={`Quitar la etiqueta ${e}`}
                onClick={() => onCambiar(etiquetas.filter((x) => x !== e))}
              >
                <Icono nombre="cerrar" tamano={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id="nota-etiquetas"
        className="campo__control"
        value={texto}
        maxLength={MAX_CARACTERES}
        disabled={llenas}
        placeholder={llenas ? `Máximo ${MAX_ETIQUETAS} etiquetas` : "p. ej. grafos, python"}
        aria-describedby="nota-etiquetas-ayuda"
        onChange={(e) => {
          const valor = e.target.value;
          if (valor.endsWith(",")) agregar(valor.slice(0, -1));
          else setTexto(valor);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            agregar();
          } else if (e.key === "Backspace" && !texto && etiquetas.length) {
            onCambiar(etiquetas.slice(0, -1));
          }
        }}
        onBlur={() => agregar()}
      />
      <p className="campo__ayuda" id="nota-etiquetas-ayuda">
        Enter o coma para agregar. Temas, técnicas o lenguajes; el buscador del catálogo las encuentra.
      </p>
    </div>
  );
}
