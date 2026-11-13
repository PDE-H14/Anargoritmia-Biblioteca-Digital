import React, { useEffect, useState } from "react";
import { getPublicNotesApi } from "../../../../api/note";
import { firmaAutor } from "../../../../utils/notas";

export const MAX_PRERREQUISITOS = 5;

/**
 * Ruta de estudio del taller: notas publicadas que conviene leer antes de
 * esta. Se eligen buscando en el catálogo; el orden es el de la lista.
 * - `ids`: identificadores elegidos (se guardan en la nota).
 * - `titulos`: { id: { titulo, firma } } para mostrarlos sin otra consulta.
 */
export function SelectorRuta({ ids, titulos, idPropio, onCambiar }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // Búsqueda con una pausa breve tras escribir
  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) {
      setResultados([]);
      return undefined;
    }
    let vigente = true;
    const temporizador = setTimeout(() => {
      setBuscando(true);
      getPublicNotesApi({ q: consulta, limite: 8 })
        .then((lista) => vigente && setResultados(lista || []))
        .catch(() => vigente && setResultados([]))
        .finally(() => vigente && setBuscando(false));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [texto]);

  const agregar = (nota) => {
    onCambiar([...ids, nota.id_documento], {
      ...titulos,
      [nota.id_documento]: { titulo: nota.titulo, firma: firmaAutor(nota.autor) || "autoría comunitaria" },
    });
    setTexto("");
  };
  const quitar = (id) => onCambiar(ids.filter((x) => x !== id), titulos);
  const mover = (i, d) => {
    const copia = [...ids];
    [copia[i], copia[i + d]] = [copia[i + d], copia[i]];
    onCambiar(copia, titulos);
  };

  const disponibles = resultados.filter((n) => n.id_documento !== idPropio && !ids.includes(n.id_documento));
  const lleno = ids.length >= MAX_PRERREQUISITOS;

  return (
    <div className="ruta">
      <p className="campo__etiqueta" id="ruta-etiqueta">
        Antes de leer esta nota
      </p>
      {ids.length === 0 ? (
        <p className="datos-nota__nota">Sin prerrequisitos. Agrega notas publicadas que conviene leer antes.</p>
      ) : (
        <ol className="ruta__lista" aria-labelledby="ruta-etiqueta">
          {ids.map((id, i) => (
            <li key={id} className="ruta__elemento">
              <span className="ruta__titulo">
                {titulos[id]?.titulo || "Nota no disponible"}
                {titulos[id]?.firma && <span className="ruta__firma">{titulos[id].firma}</span>}
              </span>
              <span className="ruta__acciones">
                <button type="button" aria-label="Subir" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Bajar"
                  title="Bajar"
                  disabled={i === ids.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  ↓
                </button>
                <button type="button" aria-label={`Quitar «${titulos[id]?.titulo || id}»`} title="Quitar" onClick={() => quitar(id)}>
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {!lleno ? (
        <div className="ruta__buscador">
          <label className="solo-lectores" htmlFor="ruta-busqueda">
            Buscar una nota publicada para agregar
          </label>
          <input
            id="ruta-busqueda"
            className="campo__control"
            type="search"
            placeholder="Buscar una nota para agregar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {texto.trim().length >= 2 && (
            <ul className="ruta__resultados" aria-live="polite">
              {buscando && <li className="ruta__vacio">Buscando…</li>}
              {!buscando && disponibles.length === 0 && <li className="ruta__vacio">Ninguna nota publicada coincide.</li>}
              {!buscando &&
                disponibles.map((n) => (
                  <li key={n.id_documento}>
                    <button type="button" onClick={() => agregar(n)}>
                      {n.titulo}
                      <span className="ruta__firma"> · {firmaAutor(n.autor) || "autoría comunitaria"}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="datos-nota__nota">Máximo {MAX_PRERREQUISITOS} prerrequisitos.</p>
      )}
    </div>
  );
}
