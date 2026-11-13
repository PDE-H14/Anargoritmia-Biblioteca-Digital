import React, { useMemo, useRef, useState } from "react";
import { Icono } from "../../UI";
import { indiceCategorias, nombreConRuta, normalizar } from "../../../utils/categorias";
import "./SelectorCategorias.css";

/**
 * Selector desplegable de categorías por niveles, con filtro por nombre.
 *
 * - `clave`: campo que identifica la categoría en `valor` ("id_categoria" o "ficha").
 * - Una sola (`multiple` falso): `valor` es una clave o ""; elegir cierra el panel.
 *   `vacio` es el texto de la opción «ninguna» (sin él no se ofrece).
 * - Varias: `valor` es una lista; `max` limita cuántas.
 * - `excluir`: claves que no se pueden elegir (la propia categoría, la principal…).
 */
export function SelectorCategorias({
  id,
  etiqueta,
  categorias,
  clave = "id_categoria",
  valor,
  multiple = false,
  max,
  excluir,
  vacio,
  ayuda,
  onCambiar,
}) {
  const indice = useMemo(() => indiceCategorias(categorias), [categorias]);
  const elegidas = useMemo(() => (multiple ? valor || [] : valor ? [valor] : []), [multiple, valor]);
  const porClave = useMemo(() => new Map(indice.lista.map((c) => [c[clave], c])), [indice, clave]);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [abiertas, setAbiertas] = useState(() => new Set());
  const botonRef = useRef(null);

  const lleno = multiple && max != null && elegidas.length >= max;
  const bloqueada = (c) => excluir?.has(c[clave]);

  const abrir = () => {
    // Al abrir se despliegan los niveles que llevan a lo ya elegido
    const rutas = new Set();
    elegidas.forEach((k) => {
      const c = porClave.get(k);
      if (c) indice.ancestros(c.ficha).forEach((f) => rutas.add(f));
    });
    setAbiertas(rutas);
    setFiltro("");
    setAbierto(true);
  };
  const cerrar = () => {
    setAbierto(false);
    botonRef.current?.focus();
  };

  const elegir = (c) => {
    if (!multiple) {
      onCambiar(c ? c[clave] : "");
      cerrar();
      return;
    }
    const k = c[clave];
    onCambiar(elegidas.includes(k) ? elegidas.filter((e) => e !== k) : [...elegidas, k]);
  };

  // Con filtro: se muestran las que coinciden y el camino hasta ellas, todo desplegado
  const consulta = normalizar(filtro);
  const visibles = useMemo(() => {
    if (!consulta) return null;
    const conjunto = new Set();
    indice.lista
      .filter((c) => normalizar(c.nombre).includes(consulta))
      .forEach((c) => {
        conjunto.add(c.ficha);
        indice.ancestros(c.ficha).forEach((f) => conjunto.add(f));
      });
    return conjunto;
  }, [consulta, indice]);

  const alternar = (ficha) =>
    setAbiertas((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(ficha)) siguientes.delete(ficha);
      else siguientes.add(ficha);
      return siguientes;
    });

  const rama = (lista, nivel, camino) => (
    <ul className={nivel === 0 ? "selector-categorias__arbol" : "selector-categorias__rama"}>
      {lista
        .filter((c) => !visibles || visibles.has(c.ficha))
        .map((c) => {
          const hijas = indice.hijasDe(c.ficha).filter((h) => !camino.has(h.ficha));
          const desplegada = hijas.length > 0 && (visibles ? true : abiertas.has(c.ficha));
          const marcada = elegidas.includes(c[clave]);
          const deshabilitada = bloqueada(c) || (lleno && !marcada);
          const idOpcion = `${id}-${camino.size}-${c.id_categoria}`;
          return (
            <li key={c.id_categoria}>
              <div className={`selector-categorias__fila${marcada ? " es-elegida" : ""}`}>
                {hijas.length > 0 ? (
                  <button
                    type="button"
                    className="selector-categorias__desplegar"
                    aria-expanded={desplegada}
                    aria-label={`${desplegada ? "Ocultar" : "Mostrar"} subcategorías de ${c.nombre}`}
                    disabled={!!visibles}
                    onClick={() => alternar(c.ficha)}
                  >
                    <Icono nombre="abajo" tamano={16} />
                  </button>
                ) : (
                  <span className="selector-categorias__hueco" aria-hidden="true" />
                )}
                {multiple ? (
                  <label className="selector-categorias__opcion" htmlFor={idOpcion}>
                    <input
                      id={idOpcion}
                      type="checkbox"
                      checked={marcada}
                      disabled={deshabilitada}
                      onChange={() => elegir(c)}
                    />
                    <span>{c.nombre}</span>
                  </label>
                ) : (
                  <button
                    type="button"
                    className="selector-categorias__opcion"
                    aria-pressed={marcada}
                    disabled={deshabilitada}
                    onClick={() => elegir(c)}
                  >
                    <span>{c.nombre}</span>
                  </button>
                )}
              </div>
              {desplegada && rama(hijas, nivel + 1, new Set([...camino, c.ficha]))}
            </li>
          );
        })}
    </ul>
  );

  const resumen = multiple
    ? null
    : valor && porClave.get(valor)
      ? nombreConRuta(indice, porClave.get(valor))
      : vacio || "Elige una categoría";

  return (
    <div
      className="campo selector-categorias"
      onKeyDown={(e) => {
        if (e.key === "Escape" && abierto) {
          e.stopPropagation(); // no cierra el diálogo que lo contiene
          cerrar();
        }
      }}
    >
      <span className="campo__etiqueta" id={`${id}-etiqueta`}>
        {etiqueta}
      </span>

      {multiple && elegidas.length > 0 && (
        <ul className="selector-categorias__fichas" aria-label={`${etiqueta}: elegidas`}>
          {elegidas.map((k) => {
            const c = porClave.get(k);
            return (
              <li key={k}>
                <span>{c ? nombreConRuta(indice, c) : k}</span>
                <button
                  type="button"
                  aria-label={`Quitar ${c?.nombre || k}`}
                  onClick={() => onCambiar(elegidas.filter((e) => e !== k))}
                >
                  <Icono nombre="cerrar" tamano={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        ref={botonRef}
        type="button"
        id={id}
        className={`selector-categorias__boton${multiple ? " selector-categorias__boton--agregar" : ""}`}
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-etiqueta ${id}`}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <span className={!multiple && !valor ? "selector-categorias__vacio" : undefined}>
          {multiple ? (elegidas.length ? "Cambiar…" : "Elegir…") : resumen}
        </span>
        <Icono nombre="abajo" tamano={18} />
      </button>

      {abierto && (
        <div className="selector-categorias__panel" id={`${id}-panel`}>
          {indice.lista.length > 6 && (
            <input
              type="search"
              className="campo__control selector-categorias__filtro"
              placeholder="Filtrar por nombre"
              aria-label="Filtrar categorías por nombre"
              value={filtro}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              onChange={(e) => setFiltro(e.target.value)}
            />
          )}
          {!multiple && vacio && !consulta && (
            <button
              type="button"
              className="selector-categorias__opcion selector-categorias__ninguna"
              aria-pressed={!valor}
              onClick={() => elegir(null)}
            >
              {vacio}
            </button>
          )}
          {visibles && visibles.size === 0 ? (
            <p className="selector-categorias__sin">Ninguna categoría se llama así.</p>
          ) : (
            rama(indice.raices, 0, new Set())
          )}
          {multiple && (
            <div className="selector-categorias__pie">
              <span>
                {max != null ? `${elegidas.length} de ${max}` : `${elegidas.length} elegidas`}
              </span>
              <button type="button" className="boton boton--secundario" onClick={cerrar}>
                Listo
              </button>
            </div>
          )}
        </div>
      )}
      {ayuda && <p className="campo__ayuda">{ayuda}</p>}
    </div>
  );
}
