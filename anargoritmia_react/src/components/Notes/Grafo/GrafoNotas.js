import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./GrafoNotas.css";

/*
 * Grafo de notas al estilo de Obsidian: cada nota es un punto, una flecha va
 * de un prerrequisito a la nota que lo pide («se lee antes de») y una línea
 * punteada une una nota con la que se basó en ella.
 *
 * La disposición sale de una simulación de fuerzas sencilla (repulsión entre
 * puntos, resortes en los enlaces y una leve gravedad al centro) que se
 * calcula de una vez antes de dibujar; al arrastrar un punto se relaja un poco
 * más. Se mueve con el ratón o con los dedos (arrastrar y pellizcar).
 */

// Colores por categoría raíz: legibles sobre fondo claro y oscuro
export const PALETA = ["#c8102e", "#2f6fdb", "#2e8540", "#c26a00", "#8a4fe0", "#00838f", "#b8860b", "#d63384", "#5b616e"];

const LARGO = 70;
const REPULSION = 2200;
const RESORTE = 0.05;
const GRAVEDAD = 0.012;
const FRICCION = 0.82;

function aristasDe(notas) {
  const ids = new Set(notas.map((n) => n.id_documento));
  const aristas = [];
  notas.forEach((n) => {
    (n.prerrequisitos || []).forEach((p) => ids.has(p) && aristas.push({ de: p, a: n.id_documento, tipo: "ruta" }));
    if (n.origen && ids.has(n.origen)) aristas.push({ de: n.origen, a: n.id_documento, tipo: "origen" });
  });
  return aristas;
}

/** Notas a `profundidad` pasos de `centro`, en cualquier dirección. */
export function vecindario(notas, centro, profundidad = 2) {
  const vecinos = new Map(notas.map((n) => [n.id_documento, new Set()]));
  aristasDe(notas).forEach(({ de, a }) => {
    vecinos.get(de).add(a);
    vecinos.get(a).add(de);
  });
  const dentro = new Set([centro]);
  let frontera = [centro];
  for (let paso = 0; paso < profundidad; paso++) {
    frontera = frontera.flatMap((id) => [...(vecinos.get(id) || [])]).filter((id) => !dentro.has(id) && dentro.add(id));
  }
  return notas.filter((n) => dentro.has(n.id_documento));
}

function paso(nodos, porId, aristas, alfa, s = 1) {
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
      if (d2 > 250000 * s * s) continue; // lejos: no se empujan
      const f = (REPULSION * s * s * alfa) / d2;
      const d = Math.sqrt(d2);
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
    const f = (d - LARGO * s) * RESORTE * alfa;
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
    n.vx = (n.vx - n.x * GRAVEDAD * alfa) * FRICCION;
    n.vy = (n.vy - n.y * GRAVEDAD * alfa) * FRICCION;
    n.x += n.vx;
    n.y += n.vy;
  });
}

function disponer(notas, aristas, centro, s) {
  // Espiral de girasol: un punto de partida determinista y repartido
  const nodos = notas.map((n, i) => {
    const angulo = i * 2.39996;
    const r = 12 * s * Math.sqrt(i + 0.5);
    return { id: n.id_documento, x: r * Math.cos(angulo), y: r * Math.sin(angulo), vx: 0, vy: 0, fijo: n.id_documento === centro };
  });
  const porId = new Map(nodos.map((n) => [n.id, n]));
  if (centro && porId.has(centro)) Object.assign(porId.get(centro), { x: 0, y: 0 });
  // Menos pasos cuando hay muchas notas, para no trabar la página
  const pasos = Math.max(60, Math.min(320, Math.floor(4e7 / Math.max(1, nodos.length * nodos.length))));
  for (let t = 0; t < pasos; t++) paso(nodos, porId, aristas, 1 - t / pasos, s);
  return { nodos, porId };
}

function limites(nodos) {
  if (!nodos.length) return { x: -100, y: -100, ancho: 200, alto: 200 };
  const xs = nodos.map((n) => n.x);
  const ys = nodos.map((n) => n.y);
  const x0 = Math.min(...xs) - 60;
  const y0 = Math.min(...ys) - 40;
  return { x: x0, y: y0, ancho: Math.max(...xs) + 60 - x0, alto: Math.max(...ys) + 40 - y0 };
}

/**
 * notas: [{ id_documento, titulo, firma, prerrequisitos, origen }]
 * colorDe(nota): color del punto · centro: nota resaltada y fija al medio
 * onAbrir(id): al elegir una nota · zoomConRueda: la rueda acerca y aleja
 * separacion: distancia entre notas enlazadas (1 = normal) · largoNombre: caracteres visibles
 */
export function GrafoNotas({
  notas,
  colorDe,
  centro = null,
  alto = 520,
  onAbrir,
  zoomConRueda = true,
  etiqueta = "Mapa de notas",
  separacion = 1,
  largoNombre = 42,
}) {
  const aristas = useMemo(() => aristasDe(notas), [notas]);
  const disposicion = useMemo(() => disponer(notas, aristas, centro, separacion), [notas, aristas, centro, separacion]);
  const [, redibujar] = useState(0);
  const [vista, setVista] = useState(null); // { x, y, k }: traslación y escala
  const [enfocada, setEnfocada] = useState(null);
  const caja = useRef(null);
  const [ancho, setAncho] = useState(800);
  const punteros = useRef(new Map());
  const gesto = useRef(null);
  const animacion = useRef(null);

  const porNota = useMemo(() => new Map(notas.map((n) => [n.id_documento, n])), [notas]);
  const grado = useMemo(() => {
    const g = new Map();
    aristas.forEach(({ de, a }) => {
      g.set(de, (g.get(de) || 0) + 1);
      g.set(a, (g.get(a) || 0) + 1);
    });
    return g;
  }, [aristas]);
  const vecinosDe = useMemo(() => {
    const v = new Map();
    aristas.forEach(({ de, a }) => {
      v.set(de, [...(v.get(de) || []), a]);
      v.set(a, [...(v.get(a) || []), de]);
    });
    return v;
  }, [aristas]);

  // Ancho real del contenedor
  useEffect(() => {
    if (!caja.current) return undefined;
    const observador = new ResizeObserver(([e]) => setAncho(Math.max(240, e.contentRect.width)));
    observador.observe(caja.current);
    return () => observador.disconnect();
  }, []);

  const ajustar = useCallback(() => {
    const l = limites(disposicion.nodos);
    const k = Math.min(2.2, Math.max(0.2, Math.min(ancho / l.ancho, alto / l.alto)));
    setVista({ k, x: (ancho - l.ancho * k) / 2 - l.x * k, y: (alto - l.alto * k) / 2 - l.y * k });
  }, [disposicion, ancho, alto]);
  useEffect(ajustar, [ajustar]);
  useEffect(() => () => cancelAnimationFrame(animacion.current), []);

  // Tras soltar un punto, la red se acomoda unos cuadros
  const relajar = useCallback(() => {
    cancelAnimationFrame(animacion.current);
    let restantes = 50;
    const cuadro = () => {
      paso(disposicion.nodos, disposicion.porId, aristas, 0.3, separacion);
      redibujar((n) => n + 1);
      if (--restantes > 0) animacion.current = requestAnimationFrame(cuadro);
    };
    animacion.current = requestAnimationFrame(cuadro);
  }, [disposicion, aristas, separacion]);

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
    if (!el || !zoomConRueda) return undefined;
    const alGirar = (e) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, aLocal(e));
    };
    el.addEventListener("wheel", alGirar, { passive: false });
    return () => el.removeEventListener("wheel", alGirar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomConRueda, ancho, alto]);

  const alPresionar = (e, id = null) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, aLocal(e));
    if (punteros.current.size === 2) {
      const [p, q] = [...punteros.current.values()];
      gesto.current = { tipo: "pellizco", distancia: Math.hypot(p.x - q.x, p.y - q.y) };
      return;
    }
    const inicio = aLocal(e);
    gesto.current = id
      ? { tipo: "punto", id, inicio, movido: false }
      : { tipo: "mover", inicio, vista: { ...vista }, movido: false };
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
      if (!g.movido) onAbrir?.(g.id);
      else {
        if (g.id !== centro) disposicion.porId.get(g.id).fijo = false;
        relajar();
      }
    }
  };

  if (!vista) return <div ref={caja} className="grafo" style={{ height: alto }} />;

  const resaltadas = enfocada ? new Set([enfocada, ...(vecinosDe.get(enfocada) || [])]) : null;
  const pocas = notas.length <= 30;
  const radio = (id) => (id === centro ? 9 : 4.5 + Math.min(6, Math.sqrt(grado.get(id) || 0) * 1.6));

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
      >
        <defs>
          <marker id="grafo-flecha" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="grafo__punta" />
          </marker>
        </defs>
        <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
          {aristas.map(({ de, a, tipo }) => {
            const p = disposicion.porId.get(de);
            const q = disposicion.porId.get(a);
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            // La flecha termina en el borde del punto, no en su centro
            const fin = { x: q.x - (dx / d) * (radio(a) + 2), y: q.y - (dy / d) * (radio(a) + 2) };
            const tenue = resaltadas && !(resaltadas.has(de) && resaltadas.has(a) && (de === enfocada || a === enfocada));
            return (
              <line
                key={`${tipo}-${de}-${a}`}
                x1={p.x}
                y1={p.y}
                x2={fin.x}
                y2={fin.y}
                className={`grafo__arista grafo__arista--${tipo}${tenue ? " es-tenue" : ""}`}
                markerEnd={tipo === "ruta" ? "url(#grafo-flecha)" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {disposicion.nodos.map((n) => {
            const nota = porNota.get(n.id);
            const tenue = resaltadas && !resaltadas.has(n.id);
            const conNombre = pocas || vista.k >= 1.3 || n.id === centro || (resaltadas && resaltadas.has(n.id));
            return (
              <g
                key={n.id}
                className={`grafo__nodo${tenue ? " es-tenue" : ""}${n.id === centro ? " es-centro" : ""}`}
                transform={`translate(${n.x} ${n.y})`}
                tabIndex={0}
                role="link"
                aria-label={`${nota.titulo}${nota.firma ? `, de ${nota.firma}` : ""}`}
                onPointerDown={(e) => alPresionar(e, n.id)}
                onPointerEnter={() => setEnfocada(n.id)}
                onPointerLeave={() => setEnfocada(null)}
                onFocus={() => setEnfocada(n.id)}
                onBlur={() => setEnfocada(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAbrir?.(n.id);
                  }
                }}
              >
                <circle r={radio(n.id)} style={{ fill: colorDe(nota) }} />
                {conNombre && (
                  <text y={radio(n.id) + 12} className="grafo__nombre" style={{ fontSize: `${12 / Math.max(0.8, vista.k)}px` }}>
                    {nota.titulo.length > largoNombre ? `${nota.titulo.slice(0, largoNombre - 1).trimEnd()}…` : nota.titulo}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="grafo__controles" role="group" aria-label="Controles del mapa">
        <button type="button" onClick={() => zoom(1.25)} aria-label="Acercar">
          +
        </button>
        <button type="button" onClick={() => zoom(1 / 1.25)} aria-label="Alejar">
          −
        </button>
        <button type="button" onClick={ajustar}>
          Ajustar
        </button>
      </div>
    </div>
  );
}
