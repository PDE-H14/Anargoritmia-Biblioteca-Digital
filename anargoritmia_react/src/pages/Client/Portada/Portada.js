import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { getCategoriesApi } from "../../../api/category";
import { getPublicNotesApi } from "../../../api/note";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { RUTAS, leerNota } from "../../../utils/constants";
import "./Portada.css";

const PRINCIPIOS = [
  {
    titulo: "En español",
    texto: "Matemáticas y cómputo escritos y pensados en nuestra lengua, sin peaje de traducción.",
  },
  {
    titulo: "Copyleft",
    texto: "Todo se publica bajo CC BY-SA 4.0. Lo que entra al procomún ya no se privatiza.",
  },
  {
    titulo: "Sin rastreadores",
    texto: "Cero telemetría, cero analítica, cero anuncios. Leer no deja huella.",
  },
  {
    titulo: "Costo cero",
    texto: "Corre en hardware de consumo y capas abiertas. No depende de presupuestos ni de permisos.",
  },
];

const NOMBRES_TIPO = { texto: "texto", codigo: "código", animacion: "animación" };

function metaNota(nota) {
  const tipos = [...new Set(nota.bloques.map((b) => NOMBRES_TIPO[b.tipo]))].join(" + ") || "sin celdas";
  const alias = nota.autor?.alias;
  const autoria = !alias || alias === "Comunidad Anargoritmia" ? "autoría comunitaria" : `por ${alias}`;
  return `${tipos} · ${autoria}`;
}

/** Portada pública (diseño F). */
export function Portada() {
  const { hash } = useLocation();
  const [parametros, setParametros] = useSearchParams();
  const [categorias, setCategorias] = useState(null);
  const [notas, setNotas] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    Promise.all([getCategoriesApi(), getPublicNotesApi()])
      .then(([cats, publicadas]) => {
        setCategorias([...(cats || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
        setNotas(publicadas || []);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(cargar, [cargar]);

  // Enlaces como /#catalogo: desplaza al catálogo
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hash, notas]);

  const fichaElegida = parametros.get("categoria");
  const elegida = categorias?.find((c) => c.ficha === fichaElegida) || null;

  const notasVisibles = useMemo(() => {
    if (!notas) return [];
    return elegida ? notas.filter((n) => n.id_categoria === elegida.id_categoria) : notas;
  }, [notas, elegida]);

  const elegir = (ficha) => {
    const siguientes = new URLSearchParams(parametros);
    if (ficha) siguientes.set("categoria", ficha);
    else siguientes.delete("categoria");
    setParametros(siguientes, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="portada">
      <section className="portada__cartel" aria-labelledby="portada-nombre">
        <p className="portada__antetitulo">Licenciatura en Matemática Algorítmica · ESFM · IPN</p>
        <h1 id="portada-nombre" className="portada__nombre">
          <span className="portada__anar">Anar</span>
          <span className="portada__goritmia">goritmia</span>
        </h1>
        <div className="portada__bajo">
          <div>
            <p className="portada__frase">
              Biblioteca algorítmica digital: apuntes, algoritmos y simulaciones escritos por estudiantes, en español,
              para que cualquiera los copie, los modifique y los comparta.
            </p>
            <div className="portada__acciones">
              <a href="#catalogo" className="portada__cta">
                Entrar al catálogo
              </a>
              <Link to={RUTAS.CREAR} className="portada__secundaria">
                Publicar una nota en el taller
              </Link>
            </div>
          </div>
          <p className="portada__sello">
            <span>CC BY-SA 4.0</span>
            <span>Copia · modifica · comparte</span>
            <span>Sin cesión de derechos</span>
          </p>
        </div>
      </section>

      <section className="portada__principios" aria-label="Principios">
        <ol>
          {PRINCIPIOS.map((p, i) => (
            <li key={p.titulo}>
              <span className="portada__numero" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{p.titulo}</h2>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="catalogo" className="portada__catalogo" aria-labelledby="catalogo-titulo">
        <h2 id="catalogo-titulo" className="portada__seccion">
          Catálogo del procomún
        </h2>

        {error ? (
          <Aviso tipo="error" titulo="No se pudo cargar el catálogo">
            <p>{error}</p>
            <Boton onClick={cargar}>Reintentar</Boton>
          </Aviso>
        ) : !notas ? (
          <Cargando texto="Cargando catálogo…" />
        ) : (
          <div className="catalogo">
            <nav className="catalogo__categorias" aria-label="Categorías">
              <ul>
                <li>
                  <button type="button" aria-pressed={!elegida} onClick={() => elegir(null)}>
                    Todas
                    <span className="catalogo__flecha" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
                {categorias.map((c) => (
                  <li key={c.id_categoria}>
                    <button type="button" aria-pressed={elegida?.id_categoria === c.id_categoria} onClick={() => elegir(c.ficha)}>
                      {c.nombre}
                      <span className="catalogo__flecha" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="catalogo__notas" aria-live="polite">
              {elegida?.descripcion && <p className="catalogo__descripcion">{elegida.descripcion}</p>}
              {notasVisibles.length === 0 ? (
                <p className="catalogo__vacio">
                  {elegida ? `Aún no hay notas publicadas en «${elegida.nombre}».` : "Aún no hay notas publicadas."}{" "}
                  <Link to={RUTAS.CREAR}>Escribe la primera en el taller</Link>.
                </p>
              ) : (
                <ul>
                  {notasVisibles.map((n) => (
                    <li key={n.id_documento}>
                      <Link to={leerNota(n.id_documento)} className="catalogo__titulo">
                        {n.titulo}
                      </Link>
                      <span className="catalogo__meta">{metaNota(n)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
