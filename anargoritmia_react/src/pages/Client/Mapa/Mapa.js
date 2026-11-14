import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { GrafoNotas } from "../../../components/Notes";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { leerNota } from "../../../utils/constants";
import { useDatosMapa } from "../../../utils/mapa";
import "./Mapa.css";

/**
 * Red de conocimiento: todas las notas publicadas y cómo se encadenan
 * (rutas de estudio y notas derivadas), al estilo del grafo de Obsidian.
 */
export function Mapa() {
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const { cargando, error, notas, raices, raizDe, colorDe, colorDeRaiz } = useDatosMapa();
  const [soloEnlazadas, setSoloEnlazadas] = useState(false);
  const raizElegida = parametros.get("categoria") || "";

  useEffect(() => {
    document.title = "Red de conocimiento · Anargoritmia";
    return () => {
      document.title = "Anargoritmia";
    };
  }, []);

  const visibles = useMemo(() => {
    if (!notas) return [];
    let lista = raizElegida ? notas.filter((n) => raizDe(n)?.ficha === raizElegida) : notas;
    if (soloEnlazadas) {
      const ids = new Set(lista.map((n) => n.id_documento));
      const enlazadas = new Set();
      lista.forEach((n) => {
        [...(n.prerrequisitos || []), n.origen].filter((p) => p && ids.has(p)).forEach((p) => {
          enlazadas.add(p);
          enlazadas.add(n.id_documento);
        });
      });
      lista = lista.filter((n) => enlazadas.has(n.id_documento));
    }
    return lista;
  }, [notas, raizElegida, soloEnlazadas, raizDe]);

  const presentes = useMemo(() => {
    if (!notas) return [];
    const usadas = new Set(notas.map((n) => raizDe(n)?.id_categoria));
    return raices.filter((r) => usadas.has(r.id_categoria));
  }, [notas, raices, raizDe]);

  const porId = useMemo(() => new Map((notas || []).map((n) => [n.id_documento, n])), [notas]);
  const enlaces = visibles.reduce((t, n) => t + (n.prerrequisitos || []).length + (n.origen ? 1 : 0), 0);

  const elegir = (ficha) => {
    setParametros((p) => {
      const s = new URLSearchParams(p);
      if (ficha) s.set("categoria", ficha);
      else s.delete("categoria");
      return s;
    }, { replace: true });
  };

  return (
    <div className="mapa">
      <h1 className="mapa__titulo">Red de conocimiento</h1>
      <p className="mapa__intro">
        Cada punto es una nota publicada. Una flecha va de una nota a la que conviene leer después, según las rutas de
        estudio que arman sus autores; una línea punteada une una nota con la que se basó en ella. Pasa el cursor para
        ver sus vecinas, arrastra para mover y haz clic para leer.
      </p>

      {error ? (
        <Aviso tipo="error" titulo="No se pudo cargar la red">
          <p>{error}</p>
          <Boton onClick={() => window.location.reload()}>Reintentar</Boton>
        </Aviso>
      ) : cargando ? (
        <Cargando texto="Dibujando la red…" />
      ) : (
        <>
          <div className="mapa__filtros">
            <label className="mapa__filtro">
              <span>Categoría</span>
              <select className="campo__control" value={raizElegida} onChange={(e) => elegir(e.target.value)}>
                <option value="">Todas</option>
                {presentes.map((r) => (
                  <option key={r.id_categoria} value={r.ficha}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="mapa__casilla">
              <input type="checkbox" checked={soloEnlazadas} onChange={(e) => setSoloEnlazadas(e.target.checked)} />
              Solo notas enlazadas
            </label>
            <p className="mapa__conteo" aria-live="polite">
              {visibles.length} {visibles.length === 1 ? "nota" : "notas"} · {enlaces} {enlaces === 1 ? "enlace" : "enlaces"}
            </p>
          </div>

          {visibles.length === 0 ? (
            <p className="mapa__vacio">No hay notas que mostrar con estos filtros.</p>
          ) : (
            <GrafoNotas
              key={`${raizElegida}-${soloEnlazadas}`}
              notas={visibles}
              colorDe={colorDe}
              alto={Math.min(720, Math.max(420, Math.round(window.innerHeight * 0.7)))}
              onAbrir={(id) => navigate(leerNota(id))}
              etiqueta="Red de conocimiento"
            />
          )}

          <ul className="mapa__leyenda" aria-label="Colores por categoría">
            {presentes.map((r) => (
              <li key={r.id_categoria}>
                <span className="mapa__muestra" style={{ background: colorDeRaiz.get(r.id_categoria) }} aria-hidden="true" />
                {r.nombre}
              </li>
            ))}
            <li>
              <span className="mapa__linea" aria-hidden="true" />
              se lee antes de
            </li>
            <li>
              <span className="mapa__linea mapa__linea--punteada" aria-hidden="true" />
              basada en
            </li>
          </ul>

          <details className="mapa__lista">
            <summary>Ver la red como lista</summary>
            <ul>
              {visibles.map((n) => {
                const antes = (n.prerrequisitos || []).map((p) => porId.get(p)).filter(Boolean);
                const origen = n.origen && porId.get(n.origen);
                return (
                  <li key={n.id_documento}>
                    <Link to={leerNota(n.id_documento)}>{n.titulo}</Link>
                    {antes.length > 0 && <span> · antes: {antes.map((a) => a.titulo).join(", ")}</span>}
                    {origen && <span> · basada en «{origen.titulo}»</span>}
                  </li>
                );
              })}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
