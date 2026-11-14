import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./GrafoNotas.css";

/*
 * Red de notas al estilo de Obsidian. Cada nota es un círculo hueco, más
 * grande cuantas más notas la piden como prerrequisito; las líneas grises son
 * rutas de estudio y las rojas, notas derivadas. Las notas de una misma
 * categoría raíz se juntan en un grupo con su nombre.
 *
 * La disposición sale de una simulación de fuerzas sencilla (repulsión,
 * resortes en los enlaces y atracción al centro de su grupo) que se calcula
 * de una vez antes de dibujar; al soltar un punto arrastrado se relaja un
 * poco más. Se mueve con el ratón o con los dedos (arrastrar y pellizcar).
 */

const LARGO = 95;
const REPULSION = 2600;
const RESORTE = 0.045;
const ATRACCION_GRUPO = 0.012;
const GRAVEDAD = 0.004;
const FRICCION = 0.82;

export function aristasDe(notas) {
  const ids = new Set(notas.map((n) => n.id_documento));
  const aristas = [];
  notas.forEach((n) => {
    (n.prerrequisitos || []).forEach((p) => ids.has(p) && aristas.push({ de: p, a: n.id_documento, tipo: "ruta" }));
    if (n.origen && ids.has(n.origen)) aristas.push({ de: n.origen, a: n.id_documento, tipo: "origen" });
  });
  return aristas;
}

function paso(nodos, porId, aristas, centros, alfa) {
  for (let i = 0; i < nodos.length; i++) {
    const a = nodos[i];
    for (let j = i + 1; j < nodos.length; j++) {
      const b = nodos[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        d2 = 1;
      }
      if (d2 > 360000) continue;
      const d = Math.sqrt(d2);
      const f = (REPULSION * alfa) / d2;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
  }
  aristas.forEach(({ de, a }) => {
    const p = porId.get(de);
    const q = porId.get(a);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - LARGO) * RESORTE * alfa;
    p.vx += (dx / d) * f;
    p.vy += (dy / d) * f;
    q.vx -= (dx / d) * f;
    q.vy -= (dy / d) * f;
  });
  nodos.forEach((n) => {
    if (n.fijo) {
      n.vx = n.vy = 0;
      return;
    }
    const c = centros.get(n.grupo) || { x: 0, y: 0 };
    n.vx = (n.vx + (c.x - n.x) * ATRACCION_GRUPO * alfa - n.x * GRAVEDAD * alfa) * FRICCION;
    n.vy = (n.vy + (c.y - n.y) * ATRACCION_GRUPO * alfa - n.y * GRAVEDAD * alfa) * FRICCION;
    n.x += n.vx;
    n.y += n.vy;
  });
}

function disponer(notas, aristas, grupoDe) {
  // Centros de los grupos repartidos en un círculo, los más grandes primero
  const tamanos = new Map();
  notas.forEach((n) => {
    const g = grupoDe(n)?.id || "";
    tamanos.set(g, (tamanos.get(g) || 0) + 1);
  });
  const grupos = [...tamanos.keys()].sort((a, b) => tamanos.get(b) - tamanos.get(a));
  // Radio que ocupará cada grupo y círculo donde caben todos sin encimarse
  const ocupa = new Map(grupos.map((g) => [g, 60 + 48 * Math.sqrt(tamanos.get(g))]));
  const suma = grupos.reduce((s, g) => s + 2 * ocupa.get(g) + 40, 0);
  const radio =
    grupos.length < 2 ? 0 : grupos.length === 2 ? (ocupa.get(grupos[0]) + ocupa.get(grupos[1])) / 2 + 40 : suma / (2 * Math.PI);
  const centros = new Map(
    grupos.map((g, i) => {
      const angulo = (i / grupos.length) * 2 * Math.PI - Math.PI / 2;
      return [g, { x: radio * Math.cos(angulo), y: radio * Math.sin(angulo) }];
    })
  );
  const nodos = notas.map((n, i) => {
    const grupo = grupoDe(n)?.id || "";
    const c = centros.get(grupo);
    const angulo = i * 2.39996;
    const r = 14 * Math.sqrt((i % 40) + 0.5);
    return { id: n.id_documento, grupo, x: c.x + r * Math.cos(angulo), y: c.y + r * Math.sin(angulo), vx: 0, vy: 0, fijo: false };
  });
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const pasos = Math.max(60, Math.min(320, Math.floor(4e7 / Math.max(1, nodos.length * nodos.length))));
  for (let t = 0; t < pasos; t++) paso(nodos, porId, aristas, centros, 1 - t / pasos);
  return { nodos, porId, centros };
}

function limites(nodos) {
  if (!nodos.length) return { x: -100, y: -100, ancho: 200, alto: 200 };
  const xs = nodos.map((n) => n.x);
  const ys = nodos.map((n) => n.y);
  const x0 = Math.min(...xs) - 120;
  const y0 = Math.min(...ys) - 90;
  return { x: x0, y: y0, ancho: Math.max(...xs) + 120 - x0, alto: Math.max(...ys) + 110 - y0 };
}

/**
 * notas: [{ id_documento, titulo, firma, prerrequisitos, origen, es_borrador }]
 * grupoDe(nota): { id, nombre } del grupo (categoría raíz) · esMia(nota)
 * seleccionada / onSeleccionar(id | null) · onAbrir(id): doble clic
 * aristasVisibles: { ruta, origen } · coincidencias: Set de ids (búsqueda) o null
 */
export function GrafoNotas({
  notas,
  grupoDe = () => null,
  esMia = () => false,
  seleccionada = null,
  onSeleccionar,
  onAbrir,
  aristasVisibles = { ruta: true, origen: true },
  coincidencias = null,
  alto = 560,
  etiqueta = "Red de notas",
}) {
  const todas = useMemo(() => aristasDe(notas), [notas]);
  const aristas = useMemo(() => todas.filter((a) => aristasVisibles[a.tipo]), [todas, aristasVisibles]);
  // La disposición usa todos los enlaces, para que no salte al ocultar unos
  const disposicion = useMemo(() => disponer(notas, todas, grupoDe), [notas, todas, grupoDe]);
  const [, redibujar] = useState(0);
  const [vista, setVista] = useState(null);
  const [enfocada, setEnfocada] = useState(null);
  const caja = useRef(null);
  const [ancho, setAncho] = useState(900);
  const punteros = useRef(new Map());
  const gesto = useRef(null);
  const animacion = useRef(null);

  const porNota = useMemo(() => new Map(notas.map((n) => [n.id_documento, n])), [notas]);
  const laPiden = useMemo(() => {
    const g = new Map();
    todas.forEach(({ de, tipo }) => tipo === "ruta" && g.set(de, (g.get(de) || 0) + 1));
    return g;
  }, [todas]);
  const vecinosDe = useMemo(() => {
    const v = new Map();
    aristas.forEach(({ de, a }) => {
      v.set(de, [...(v.get(de) || []), a]);
      v.set(a, [...(v.get(a) || []), de]);
    });
    return v;
  }, [aristas]);

  useEffect(() => {
    if (!caja.current) return undefined;
    const observador = new ResizeObserver(([e]) => setAncho(Math.max(260, e.contentRect.width)));
    observador.observe(caja.current);
    return () => observador.disconnect();
  }, []);

  const ajustar = useCallback(() => {
    const l = limites(disposicion.nodos);
    const k = Math.min(1.6, Math.max(0.2, Math.min(ancho / l.ancho, alto / l.alto)));
    setVista({ k, x: (ancho - l.ancho * k) / 2 - l.x * k, y: (alto - l.alto * k) / 2 - l.y * k });
  }, [disposicion, ancho, alto]);
  useEffect(ajustar, [ajustar]);
  useEffect(() => () => cancelAnimationFrame(animacion.current), []);

  const relajar = useCallback(() => {
    cancelAnimationFrame(animacion.current);
    let restantes = 50;
    const cuadro = () => {
      paso(disposicion.nodos, disposicion.porId, todas, disposicion.centros, 0.3);
      redibujar((n) => n + 1);
      if (--restantes > 0) animacion.current = requestAnimationFrame(cuadro);
    };
    animacion.current = requestAnimationFrame(cuadro);
  }, [disposicion, todas]);

  const aLocal = (e) => {
    const r = caja.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const zoom = (factor, origen = { x: ancho / 2, y: alto / 2 }) => {
    setVista((v) => {
      const k = Math.min(4, Math.max(0.15, v.k * factor));
      return { k, x: origen.x - ((origen.x - v.x) * k) / v.k, y: origen.y - ((origen.y - v.y) * k) / v.k };
    });
  };

  useEffect(() => {
    const el = caja.current;
    if (!el) return undefined;
    const alGirar = (e) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, aLocal(e));
    };
    el.addEventListener("wheel", alGirar, { passive: false });
    return () => el.removeEventListener("wheel", alGirar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancho, alto]);

  const alPresionar = (e, id = null) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, aLocal(e));
    if (punteros.current.size === 2) {
      const [p, q] = [...punteros.current.values()];
      gesto.current = { tipo: "pellizco", distancia: Math.hypot(p.x - q.x, p.y - q.y) };
      return;
    }
    const inicio = aLocal(e);
    gesto.current = id ? { tipo: "punto", id, inicio, movido: false } : { tipo: "mover", inicio, vista: { ...vista }, movido: false };
    e.stopPropagation();
  };

  const alMover = (e) => {
    if (!punteros.current.has(e.pointerId) || !gesto.current) return;
    const actual = aLocal(e);
    punteros.current.set(e.pointerId, actual);
    const g = gesto.current;
    if (g.tipo === "pellizco" && punteros.current.size === 2) {
      const [p, q] = [...punteros.current.values()];
      const distancia = Math.hypot(p.x - q.x, p.y - q.y);
      zoom(distancia / g.distancia, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      g.distancia = distancia;
      return;
    }
    if (Math.hypot(actual.x - g.inicio.x, actual.y - g.inicio.y) > 4) g.movido = true;
    if (!g.movido) return;
    if (g.tipo === "mover") {
      setVista({ ...g.vista, x: g.vista.x + actual.x - g.inicio.x, y: g.vista.y + actual.y - g.inicio.y });
    } else if (g.tipo === "punto") {
      const nodo = disposicion.porId.get(g.id);
      nodo.x = (actual.x - vista.x) / vista.k;
      nodo.y = (actual.y - vista.y) / vista.k;
      nodo.fijo = true;
      redibujar((n) => n + 1);
    }
  };

  const alSoltar = (e) => {
    punteros.current.delete(e.pointerId);
    const g = gesto.current;
    if (punteros.current.size > 0) return;
    gesto.current = null;
    if (!g) return;
    if (g.tipo === "punto") {
      if (!g.movido) onSeleccionar?.(g.id);
      else {
        disposicion.porId.get(g.id).fijo = false;
        relajar();
      }
    } else if (g.tipo === "mover" && !g.movido) {
      onSeleccionar?.(null);
    }
  };

  if (!vista) return <div ref={caja} className="grafo" style={{ height: alto }} />;

  const resaltadas = enfocada ? new Set([enfocada, ...(vecinosDe.get(enfocada) || [])]) : null;
  const conNombres = notas.length <= 25 || vista.k >= 0.8;
  const radio = (id) => Math.min(26, 9 + Math.sqrt(laPiden.get(id) || 0) * 4);

  // Grupos dibujados alrededor de sus notas, en su posición actual
  const grupos = [];
  const miembros = new Map();
  disposicion.nodos.forEach((n) => miembros.set(n.grupo, [...(miembros.get(n.grupo) || []), n]));
  miembros.forEach((lista, id) => {
    if (!id || lista.length < 2) return;
    const cx = lista.reduce((s, n) => s + n.x, 0) / lista.length;
    const cy = lista.reduce((s, n) => s + n.y, 0) / lista.length;
    const r = Math.max(...lista.map((n) => Math.hypot(n.x - cx, n.y - cy) + radio(n.id))) + 46;
    const nombre = grupoDe(porNota.get(lista[0].id))?.nombre || "";
    grupos.push({ id, cx, cy, r, nombre });
  });

  return (
    <div className="grafo" ref={caja} style={{ height: alto }}>
      <svg
        className="grafo__lienzo"
        width={ancho}
        height={alto}
        role="group"
        aria-label={`${etiqueta}: ${notas.length} notas y ${aristas.length} enlaces. La lista equivalente está debajo.`}
        onPointerDown={(e) => alPresionar(e)}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onDoubleClick={(e) => e.target === e.currentTarget && ajustar()}
      >
        <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
          {grupos.map((g) => (
            <g key={g.id} className="grafo__grupo" aria-hidden="true">
              <circle cx={g.cx} cy={g.cy} r={g.r} />
              <text x={g.cx} y={g.cy + g.r - 18} className="grafo__grupo-nombre">
                {g.nombre}
              </text>
            </g>
          ))}
          {aristas.map(({ de, a, tipo }) => {
            const p = disposicion.porId.get(de);
            const q = disposicion.porId.get(a);
            const tocaSeleccion = seleccionada && (de === seleccionada || a === seleccionada);
            const tenue =
              (resaltadas && !(resaltadas.has(de) && resaltadas.has(a))) ||
              (coincidencias && !(coincidencias.has(de) && coincidencias.has(a)));
            return (
              <line
                key={`${tipo}-${de}-${a}`}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                className={`grafo__arista grafo__arista--${tipo}${tocaSeleccion ? " es-activa" : ""}${tenue ? " es-tenue" : ""}`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {disposicion.nodos.map((n) => {
            const nota = porNota.get(n.id);
            const r = radio(n.id);
            const elegida = n.id === seleccionada;
            const tenue = (resaltadas && !resaltadas.has(n.id)) || (coincidencias && !coincidencias.has(n.id));
            return (
              <g
                key={n.id}
                className={`grafo__nodo${tenue ? " es-tenue" : ""}${elegida ? " es-elegida" : ""}${nota.es_borrador ? " es-borrador" : ""}`}
                transform={`translate(${n.x} ${n.y})`}
                tabIndex={0}
                role="button"
                aria-pressed={elegida}
                aria-label={`${nota.titulo}${nota.firma ? `, de ${nota.firma}` : ""}${nota.es_borrador ? ", borrador" : ""}`}
                onPointerDown={(e) => alPresionar(e, n.id)}
                onDoubleClick={() => onAbrir?.(n.id)}
                onPointerEnter={() => setEnfocada(n.id)}
                onPointerLeave={() => setEnfocada(null)}
                onFocus={() => setEnfocada(n.id)}
                onBlur={() => setEnfocada(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (elegida) onAbrir?.(n.id);
                    else onSeleccionar?.(n.id);
                  }
                }}
              >
                {elegida && <circle r={r + 7} className="grafo__halo" />}
                <circle r={r} className="grafo__punto" />
                {esMia(nota) && <circle cy={-r} r={4} className="grafo__mia" />}
                {(conNombres || elegida || (laPiden.get(n.id) || 0) >= 2 || (resaltadas && resaltadas.has(n.id))) && (
                  <text y={r + 17} className={`grafo__nombre${elegida ? " grafo__nombre--elegida" : ""}`}>
                    {nota.titulo.length > 40 ? `${nota.titulo.slice(0, 38).trimEnd()}…` : nota.titulo}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
