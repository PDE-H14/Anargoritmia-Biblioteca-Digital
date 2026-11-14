import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import { RUTA_MAPA, leerNota } from "../../../utils/constants";
import { useDatosRed } from "../../../utils/mapa";
import "./RedLocal.css";

const ANCHO = 210;
const ALTO = 230;
const CENTRO = { x: ANCHO / 2, y: ALTO / 2 };
const RADIO = 82;

const RELACION = {
  antes: "antes de leer",
  sigue: "para seguir",
  origen: "esta nota se basó en ella",
  derivada: "se basó en esta nota",
};

/**
 * Red local de una nota, para el margen de la lectura: la nota al centro y
 * sus vecinas numeradas (prerrequisitos, notas que la siguen, la nota de
 * origen y sus derivadas), con la lista equivalente debajo.
 */
export function RedLocal({ idNota }) {
  const { notas } = useDatosRed();

  const vecinas = useMemo(() => {
    if (!notas) return [];
    const nota = notas.find((n) => n.id_documento === idNota);
    if (!nota) return [];
    const porId = new Map(notas.map((n) => [n.id_documento, n]));
    const lista = [];
    const vistas = new Set([idNota]);
    const agregar = (n, relacion) => {
      if (n && !vistas.has(n.id_documento)) {
        vistas.add(n.id_documento);
        lista.push({ nota: n, relacion });
      }
    };
    (nota.prerrequisitos || []).forEach((p) => agregar(porId.get(p), "antes"));
    notas.filter((n) => (n.prerrequisitos || []).includes(idNota)).forEach((n) => agregar(n, "sigue"));
    if (nota.origen) agregar(porId.get(nota.origen), "origen");
    notas.filter((n) => n.origen === idNota).forEach((n) => agregar(n, "derivada"));
    return lista.slice(0, 12);
  }, [notas, idNota]);

  if (!vecinas.length) return null;

  // Vecinas repartidas en un círculo alrededor de la nota
  const posiciones = vecinas.map((_, i) => {
    const angulo = -Math.PI / 2 + (i / vecinas.length) * 2 * Math.PI + (vecinas.length % 2 ? 0 : Math.PI / vecinas.length);
    return { x: CENTRO.x + RADIO * Math.cos(angulo), y: CENTRO.y + RADIO * Math.sin(angulo) };
  });
  const indice = new Map(vecinas.map((v, i) => [v.nota.id_documento, i]));
  // Enlaces entre las propias vecinas, como en la red completa
  const entreVecinas = [];
  vecinas.forEach((v, i) => {
    (v.nota.prerrequisitos || []).forEach((p) => indice.has(p) && entreVecinas.push({ de: indice.get(p), a: i, roja: false }));
    if (v.nota.origen && indice.has(v.nota.origen)) entreVecinas.push({ de: indice.get(v.nota.origen), a: i, roja: true });
  });
  const esRoja = (relacion) => relacion === "origen" || relacion === "derivada";

  return (
    <div className="red-local">
      <p className="lectura__versalitas">Red local</p>
      <svg className="red-local__dibujo" viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO} aria-hidden="true">
        {entreVecinas.map(({ de, a, roja }) => (
          <line
            key={`${de}-${a}`}
            x1={posiciones[de].x}
            y1={posiciones[de].y}
            x2={posiciones[a].x}
            y2={posiciones[a].y}
            className={`red-local__linea${roja ? " red-local__linea--roja" : ""}`}
          />
        ))}
        {vecinas.map((v, i) => (
          <line
            key={v.nota.id_documento}
            x1={CENTRO.x}
            y1={CENTRO.y}
            x2={posiciones[i].x}
            y2={posiciones[i].y}
            className={`red-local__linea${esRoja(v.relacion) ? " red-local__linea--roja" : ""}`}
          />
        ))}
        <circle cx={CENTRO.x} cy={CENTRO.y} r={21} className="red-local__centro" />
        {vecinas.map((v, i) => (
          <g key={v.nota.id_documento} transform={`translate(${posiciones[i].x} ${posiciones[i].y})`}>
            <circle r={14} className={`red-local__vecina${esRoja(v.relacion) ? " red-local__vecina--roja" : ""}`} />
            <text className="red-local__numero" dy="0.35em">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <ol className="red-local__lista">
        {vecinas.map((v) => (
          <li key={v.nota.id_documento} className={esRoja(v.relacion) ? "red-local__roja" : ""}>
            <Link to={leerNota(v.nota.id_documento)}>{v.nota.titulo}</Link>
            <span className="red-local__relacion">{RELACION[v.relacion]}</span>
          </li>
        ))}
      </ol>
      <Link to={RUTA_MAPA} className="red-local__completa">
        Ver la red completa →
      </Link>
    </div>
  );
}
