import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../hooks";
import { GrafoNotas } from "../../../components/Notes";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { editarNota, leerNota } from "../../../utils/constants";
import { normalizar } from "../../../utils/categorias";
import { useDatosRed } from "../../../utils/mapa";
import "./Mapa.css";

const NOMBRE_TIPO = { texto: "texto", codigo: "código", animacion: "animación", ejercicio: "ejercicio" };

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function enumerar(lista) {
  return lista.length <= 1 ? lista.join("") : `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
}

function describirCeldas(celdas) {
  if (!celdas) return "";
  const tipos = enumerar((celdas.tipos_publicos || []).map((t) => NOMBRE_TIPO[t] || t));
  return `${plural(celdas.publicas || 0, "celda pública", "celdas públicas")}${tipos ? `: ${tipos}` : ""}.`;
}

/**
 * Red del procomún: todas las notas publicadas y cómo se encadenan (rutas de
 * estudio y notas derivadas), agrupadas por categoría raíz. Se usa en el
 * sitio público (/red) y en el taller (/lab/red).
 */
export function Mapa() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const yo = auth?.me ? String(auth.me.id) : null;
  const [verRutas, setVerRutas] = useState(true);
  const [verDerivadas, setVerDerivadas] = useState(true);
  const [conBorradores, setConBorradores] = useState(false);
  const [soloMias, setSoloMias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);
  const { cargando, error, notas, grupoDe, rutaDe } = useDatosRed({ borradores: conBorradores, token: auth?.token });

  useEffect(() => {
    document.title = "Red del procomún · Anargoritmia";
    return () => {
      document.title = "Anargoritmia";
    };
  }, []);

  const visibles = useMemo(() => {
    if (!notas) return [];
    return soloMias && yo ? notas.filter((n) => n.id_autor === yo) : notas;
  }, [notas, soloMias, yo]);
  const porId = useMemo(() => new Map(visibles.map((n) => [n.id_documento, n])), [visibles]);

  const coincidencias = useMemo(() => {
    const consulta = normalizar(busqueda.trim());
    if (!consulta) return null;
    const palabras = consulta.split(/\s+/);
    return new Set(
      visibles
        .filter((n) => {
          const texto = normalizar([n.titulo, n.firma, rutaDe?.(n), ...(n.etiquetas || [])].join(" "));
          return palabras.every((p) => texto.includes(p));
        })
        .map((n) => n.id_documento)
    );
  }, [busqueda, visibles, rutaDe]);

  const aristasVisibles = useMemo(() => ({ ruta: verRutas, origen: verDerivadas }), [verRutas, verDerivadas]);
  const esMia = useCallback((n) => !!yo && n.id_autor === yo, [yo]);
  const abrir = useCallback((id) => navigate(leerNota(id)), [navigate]);

  const publicas = visibles.filter((n) => !n.es_borrador).length;
  const rutas = visibles.reduce((t, n) => t + (n.prerrequisitos || []).filter((p) => porId.has(p)).length, 0);
  const derivadas = visibles.filter((n) => n.origen && porId.has(n.origen)).length;
  const borradores = visibles.length - publicas;
  const alto = window.innerWidth < 700 ? 440 : Math.max(540, Math.min(900, window.innerHeight - 260));
  const elegida = seleccionada && porId.get(seleccionada);

  const buscar = (e) => {
    e.preventDefault();
    if (coincidencias?.size) setSeleccionada([...coincidencias][0]);
  };

  return (
    <div className="red">
      <header className="red__cabecera">
        <div>
          <h1 className="red__titulo">Red del procomún</h1>
          {notas && (
            <p className="red__resumen">
              {plural(publicas, "nota pública", "notas públicas")} · {plural(rutas, "ruta de estudio", "rutas de estudio")} ·{" "}
              {plural(derivadas, "nota derivada", "notas derivadas")}
              {borradores > 0 && ` · ${plural(borradores, "borrador tuyo", "borradores tuyos")}`}
            </p>
          )}
        </div>
        <Boton to="/#catalogo" className="red__catalogo">
          Ver como catálogo
        </Boton>
      </header>

      {error ? (
        <div className="red__mensaje">
          <Aviso tipo="error" titulo="No se pudo cargar la red">
            <p>{error}</p>
            <Boton onClick={() => window.location.reload()}>Reintentar</Boton>
          </Aviso>
        </div>
      ) : cargando ? (
        <div className="red__mensaje">
          <Cargando texto="Dibujando la red…" />
        </div>
      ) : (
        <>
          <div className="red__escena">
            <form className="red__buscar" role="search" onSubmit={buscar}>
              <label htmlFor="red-busqueda">Buscar en la red</label>
              <input
                id="red-busqueda"
                type="search"
                className="campo__control"
                placeholder="Título, tema, etiqueta o autor"
                value={busqueda}
                maxLength={100}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {coincidencias && (
                <p className="red__coinciden" aria-live="polite">
                  {coincidencias.size ? plural(coincidencias.size, "nota coincide", "notas coinciden") : "Ninguna nota coincide"}
                </p>
              )}
            </form>

            <div className="red__filtros" role="group" aria-label="Qué mostrar">
              <button type="button" className="red__chip" aria-pressed={verRutas} onClick={() => setVerRutas((v) => !v)}>
                Rutas
              </button>
              <button
                type="button"
                className="red__chip red__chip--rojo"
                aria-pressed={verDerivadas}
                onClick={() => setVerDerivadas((v) => !v)}
              >
                Derivadas
              </button>
              {yo && (
                <>
                  <button type="button" className="red__chip" aria-pressed={conBorradores} onClick={() => setConBorradores((v) => !v)}>
                    Mis borradores
                  </button>
                  <button type="button" className="red__chip" aria-pressed={soloMias} onClick={() => setSoloMias((v) => !v)}>
                    Solo mis notas
                  </button>
                </>
              )}
            </div>

            <div className="red__lienzo">
              {visibles.length === 0 ? (
                <p className="red__vacio">No hay notas que mostrar con estos filtros.</p>
              ) : (
                <GrafoNotas
                  notas={visibles}
                  grupoDe={grupoDe}
                  esMia={esMia}
                  seleccionada={seleccionada}
                  onSeleccionar={setSeleccionada}
                  onAbrir={abrir}
                  aristasVisibles={aristasVisibles}
                  coincidencias={coincidencias}
                  alto={alto}
                  etiqueta="Red del procomún"
                />
              )}
            </div>

            <ul className="red__leyenda" aria-label="Leyenda">
              <li>
                <span className="red__linea" aria-hidden="true" />
                Ruta de estudio: se lee antes de
              </li>
              <li>
                <span className="red__linea red__linea--roja" aria-hidden="true" />
                Nota derivada: basada en
              </li>
              <li>
                <span className="red__circulo" aria-hidden="true" />
                Nota · tamaño según cuántas la piden antes
              </li>
              {yo && (
                <li>
                  <span className="red__punto" aria-hidden="true" />
                  Nota tuya
                </li>
              )}
            </ul>

            {elegida && (
              <FichaNota
                nota={elegida}
                porId={porId}
                visibles={visibles}
                ruta={rutaDe(elegida)}
                puedeEditar={esMia(elegida) || !!auth?.me?.is_staff}
                onElegir={setSeleccionada}
                onCerrar={() => setSeleccionada(null)}
              />
            )}
          </div>

          <footer className="red__pie">
            <p>La red se calcula en tu navegador a partir del catálogo público. El servidor no registra lo que miras.</p>
            <p>Arrastra para mover · rueda o pellizco para acercar · clic para ver la nota · doble clic para abrirla</p>
          </footer>

          <details className="red__lista">
            <summary>Ver la red como lista</summary>
            <ul>
              {visibles.map((n) => {
                const antes = (n.prerrequisitos || []).map((p) => porId.get(p)).filter(Boolean);
                const origen = n.origen && porId.get(n.origen);
                return (
                  <li key={n.id_documento}>
                    <Link to={leerNota(n.id_documento)}>{n.titulo}</Link>
                    {n.es_borrador && <span> · borrador</span>}
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

/** Ficha de la nota elegida en la red. */
function FichaNota({ nota, porId, visibles, ruta, puedeEditar, onElegir, onCerrar }) {
  const antes = (nota.prerrequisitos || []).map((p) => porId.get(p)).filter(Boolean);
  const siguen = visibles.filter((n) => (n.prerrequisitos || []).includes(nota.id_documento));
  const origen = nota.origen && porId.get(nota.origen);
  const derivadas = visibles.filter((n) => n.origen === nota.id_documento);
  const enlace = (n) => (
    <button key={n.id_documento} type="button" className="red__enlace" onClick={() => onElegir(n.id_documento)}>
      {n.titulo}
    </button>
  );

  return (
    <aside className="red__ficha" aria-label={`Nota elegida: ${nota.titulo}`}>
      <button type="button" className="red__cerrar" onClick={onCerrar} aria-label="Cerrar la ficha">
        ×
      </button>
      {ruta && <p className="red__ficha-ruta">{ruta}</p>}
      <h2 className="red__ficha-titulo">{nota.titulo}</h2>
      <p className="red__ficha-autor">
        {[nota.firma, nota.es_borrador ? "borrador" : null].filter(Boolean).join(" · ")}
        {nota.celdas && ` · ${describirCeldas(nota.celdas)}`}
      </p>
      <dl className="red__ficha-datos">
        <div>
          <dt>Antes de leer</dt>
          <dd>{antes.length ? plural(antes.length, "nota", "notas") : "ninguna"}</dd>
        </div>
        <div>
          <dt>Para seguir</dt>
          <dd>{siguen.length ? plural(siguen.length, "nota", "notas") : "ninguna"}</dd>
        </div>
        {origen && (
          <div>
            <dt>Basada en</dt>
            <dd>{enlace(origen)}</dd>
          </div>
        )}
        {derivadas.length > 0 && (
          <div>
            <dt>Derivadas</dt>
            <dd className="red__ficha-lista">{derivadas.map(enlace)}</dd>
          </div>
        )}
      </dl>
      <div className="red__ficha-acciones">
        <Boton variante="principal" to={leerNota(nota.id_documento)}>
          Leer
        </Boton>
        {puedeEditar && <Boton to={editarNota(nota.id_documento)}>Editar</Boton>}
      </div>
    </aside>
  );
}
