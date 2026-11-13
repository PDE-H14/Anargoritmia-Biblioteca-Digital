import React, { useMemo, useState } from "react";
import { Boton, Icono } from "../../../components/UI";
import { indiceCategorias, normalizar } from "../../../utils/categorias";

/**
 * Índice de categorías para administrar: raíces y, al desplegarlas, sus
 * subcategorías. Una categoría con varios padres aparece bajo cada uno.
 */
export function IndiceCategorias({ categorias, onEditar, onEliminar, onSubcategoria }) {
  const indice = useMemo(() => indiceCategorias(categorias), [categorias]);
  const [abiertas, setAbiertas] = useState(() => new Set());
  const [filtro, setFiltro] = useState("");

  const consulta = normalizar(filtro);
  // Con filtro: las que coinciden y el camino hasta ellas, todo desplegado
  const visibles = useMemo(() => {
    if (!consulta) return null;
    const conjunto = new Set();
    indice.lista
      .filter((c) => normalizar(`${c.nombre} ${c.ficha}`).includes(consulta))
      .forEach((c) => {
        conjunto.add(c.ficha);
        indice.ancestros(c.ficha).forEach((f) => conjunto.add(f));
      });
    return conjunto;
  }, [consulta, indice]);

  const conHijas = indice.lista.filter((c) => indice.hijasDe(c.ficha).length);
  const todoAbierto = conHijas.length > 0 && conHijas.every((c) => abiertas.has(c.ficha));

  const alternar = (ficha) =>
    setAbiertas((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(ficha)) siguientes.delete(ficha);
      else siguientes.add(ficha);
      return siguientes;
    });

  const rama = (lista, padre, camino) => (
    <ul className={padre ? "indice-categorias__rama" : "indice-categorias__lista"}>
      {lista
        .filter((c) => !visibles || visibles.has(c.ficha))
        .map((c) => {
          const hijas = indice.hijasDe(c.ficha).filter((h) => !camino.has(h.ficha));
          const desplegada = hijas.length > 0 && (visibles ? true : abiertas.has(c.ficha));
          const otrosPadres = indice
            .padresDe(c)
            .filter((p) => p !== padre?.ficha)
            .map((p) => indice.porFicha.get(p).nombre);
          return (
            <li key={c.id_categoria}>
              <div className="indice-categorias__fila">
                {hijas.length > 0 ? (
                  <button
                    type="button"
                    className="indice-categorias__desplegar"
                    aria-expanded={desplegada}
                    aria-label={`${desplegada ? "Ocultar" : "Mostrar"} las ${hijas.length} subcategorías de ${c.nombre}`}
                    disabled={!!visibles}
                    onClick={() => alternar(c.ficha)}
                  >
                    <Icono nombre="abajo" tamano={18} />
                  </button>
                ) : (
                  <span className="indice-categorias__desplegar" aria-hidden="true" />
                )}
                {c.imagen_portada ? (
                  <img
                    className="categorias__portada"
                    src={c.imagen_portada}
                    alt=""
                    style={{ objectPosition: `${c.enfoque_x ?? 50}% ${c.enfoque_y ?? 50}%` }}
                  />
                ) : (
                  <span className="categorias__portada categorias__portada--vacia" title="Sin portada">
                    <Icono nombre="carpeta" />
                    <span className="solo-lectores">Sin portada</span>
                  </span>
                )}
                <div className="indice-categorias__datos">
                  <p className="indice-categorias__nombre">
                    {c.nombre}
                    {hijas.length > 0 && (
                      <span className="indice-categorias__cuenta">
                        {hijas.length} {hijas.length === 1 ? "subcategoría" : "subcategorías"}
                      </span>
                    )}
                  </p>
                  <p className="indice-categorias__ficha">
                    {c.ficha}
                    {otrosPadres.length > 0 && ` · también en ${otrosPadres.join(", ")}`}
                  </p>
                  {c.descripcion && <p className="indice-categorias__descripcion">{c.descripcion}</p>}
                </div>
                <div className="indice-categorias__acciones">
                  <Boton variante="enlace" onClick={() => onSubcategoria(c)} aria-label={`Nueva subcategoría de «${c.nombre}»`}>
                    + Sub
                  </Boton>
                  <Boton variante="enlace" onClick={() => onEditar(c)} aria-label={`Editar «${c.nombre}»`}>
                    Editar
                  </Boton>
                  <Boton variante="enlace-peligro" onClick={() => onEliminar(c)} aria-label={`Eliminar «${c.nombre}»`}>
                    Eliminar
                  </Boton>
                </div>
              </div>
              {desplegada && rama(hijas, c, new Set([...camino, c.ficha]))}
            </li>
          );
        })}
    </ul>
  );

  return (
    <section className="indice-categorias" aria-label="Índice de categorías">
      <div className="indice-categorias__barra">
        <input
          type="search"
          className="campo__control"
          placeholder="Filtrar por nombre o ficha"
          aria-label="Filtrar categorías por nombre o ficha"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        {conHijas.length > 0 && !visibles && (
          <Boton
            onClick={() => setAbiertas(todoAbierto ? new Set() : new Set(conHijas.map((c) => c.ficha)))}
          >
            {todoAbierto ? "Plegar todo" : "Desplegar todo"}
          </Boton>
        )}
      </div>
      {visibles && visibles.size === 0 ? (
        <p className="indice-categorias__sin">Ninguna categoría coincide con «{filtro}».</p>
      ) : (
        rama(indice.raices, null, new Set())
      )}
    </section>
  );
}
