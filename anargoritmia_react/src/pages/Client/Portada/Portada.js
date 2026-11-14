import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { getCategoriesApi } from "../../../api/category";
import { conReintentos } from "../../../api/http";
import { getPublicNotesApi } from "../../../api/note";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { RUTAS, leerNota } from "../../../utils/constants";
import { indiceCategorias, nombreConRuta } from "../../../utils/categorias";
import { firmaAutor, tiposDeCeldas } from "../../../utils/notas";
import { useNotaSugerencias } from "../../../utils/sugerencias";
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


// Una nota aparece en su categoría principal y en las extra
const categoriasDe = (nota) => [nota.id_categoria, ...(nota.categorias_extra || [])];

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const NOTAS_POR_PAGINA = 20;

// Números a mostrar: la primera, la última y las vecinas de la actual; «…» en los huecos
function paginasVisibles(actual, total) {
  const numeros = [...new Set([1, actual - 1, actual, actual + 1, total])].filter((n) => n >= 1 && n <= total);
  return numeros.flatMap((n, i) => (i > 0 && n - numeros[i - 1] > 1 ? ["…", n] : [n]));
}

function Paginacion({ pagina, total, alCambiar }) {
  if (total <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Páginas del catálogo">
      <button type="button" className="paginacion__paso" disabled={pagina === 1} onClick={() => alCambiar(pagina - 1)}>
        ← Anterior
      </button>
      <ol>
        {paginasVisibles(pagina, total).map((n, i) =>
          n === "…" ? (
            <li key={`hueco-${i}`} className="paginacion__hueco" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                className="paginacion__numero"
                aria-current={n === pagina ? "page" : undefined}
                aria-label={`Página ${n}`}
                onClick={() => n !== pagina && alCambiar(n)}
              >
                {n}
              </button>
            </li>
          )
        )}
      </ol>
      <button type="button" className="paginacion__paso" disabled={pagina === total} onClick={() => alCambiar(pagina + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}

/**
 * Cabecera de la categoría elegida (o de «Todas»). Según el ancho de la
 * columna (Portada.css):
 * - ancha: banda con la portada a todo lo ancho, línea roja y, debajo, nombre,
 *   conteo y descripción;
 * - media: ficha 4:3 con el bloque rojo desplazado y el texto al lado;
 * - angosta: la ficha con la imagen arriba.
 * Sin imagen (o si no carga) queda solo el texto.
 */
function CabeceraCategoria({ nombre, descripcion, imagen, enfoque, meta }) {
  const [fallo, setFallo] = useState(false);
  const sinImagen = !imagen || fallo;
  return (
    <header className={`ficha-categoria${sinImagen ? " ficha-categoria--sin-imagen" : ""}`}>
      {!sinImagen && (
        <div className="ficha-categoria__imagen">
          {/* Decorativa: el nombre de la categoría está al lado */}
          <img
            src={imagen}
            alt=""
            onError={() => setFallo(true)}
            // Los dos recortes (banda y ficha) se hacen alrededor del punto de enfoque
            style={{ objectPosition: `${enfoque.x}% ${enfoque.y}%` }}
          />
        </div>
      )}
      <div className="ficha-categoria__texto">
        <p className="ficha-categoria__meta">{meta}</p>
        <h3 className="ficha-categoria__nombre">{nombre}</h3>
        {descripcion && <p className="ficha-categoria__descripcion">{descripcion}</p>}
      </div>
    </header>
  );
}

/** Portada pública (diseño F). */
export function Portada() {
  const { hash } = useLocation();
  const [parametros, setParametros] = useSearchParams();
  const [categorias, setCategorias] = useState(null);
  const [notas, setNotas] = useState(null);
  const [error, setError] = useState(null);
  // Búsqueda: el texto vive en la URL (?q=) para poder compartir el enlace
  const consulta = parametros.get("q") || "";
  const [texto, setTexto] = useState(consulta);
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const notaSugerencias = useNotaSugerencias();

  const [despertando, setDespertando] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    setDespertando(false);
    // Si el servidor estaba dormido, se reintenta mientras despierta
    conReintentos(() => Promise.all([getCategoriesApi(), getPublicNotesApi()]), {
      alReintentar: () => setDespertando(true),
    })
      .then(([cats, publicadas]) => {
        setCategorias(cats || []);
        setNotas(publicadas || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setDespertando(false));
  }, []);
  useEffect(cargar, [cargar]);

  // Enlaces como /#catalogo: desplaza al catálogo
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hash, notas]);

  // Un enlace con ?q= (p. ej. una etiqueta en la lectura) llena el buscador
  useEffect(() => {
    setTexto((actual) => (actual.trim() === consulta ? actual : consulta));
  }, [consulta]);

  const indice = useMemo(() => indiceCategorias(categorias), [categorias]);
  const elegida = indice.porFicha.get(parametros.get("categoria")) || null;
  const migas = elegida ? indice.ruta(elegida) : [];

  // Identificadores que abarca una categoría: ella y todas sus descendientes
  const abarca = useCallback(
    (c) => new Set([c.id_categoria, ...[...indice.descendientes(c.ficha)].map((f) => indice.porFicha.get(f).id_categoria)]),
    [indice]
  );
  const notasPorFicha = useMemo(() => {
    const cuenta = new Map();
    indice.lista.forEach((c) => {
      const ids = abarca(c);
      cuenta.set(c.ficha, (notas || []).filter((n) => categoriasDe(n).some((id) => ids.has(id))).length);
    });
    return cuenta;
  }, [indice, notas, abarca]);

  const cambiarParametro = useCallback(
    (nombre, valor) => {
      setParametros(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          if ((siguientes.get(nombre) || "") === (valor || "")) return actuales;
          if (valor) siguientes.set(nombre, valor);
          else siguientes.delete(nombre);
          siguientes.delete("pagina"); // otra categoría u otra búsqueda: de vuelta a la primera página
          return siguientes;
        },
        { replace: true, preventScrollReset: true }
      );
    },
    [setParametros]
  );

  // La página vive en la URL (?pagina=2) y entra al historial: «atrás» regresa a la anterior
  const irAPagina = (numero) => {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        if (numero > 1) siguientes.set("pagina", String(numero));
        else siguientes.delete("pagina");
        return siguientes;
      },
      { preventScrollReset: true }
    );
    document.getElementById("catalogo-lista")?.scrollIntoView({ block: "start" });
  };

  // Escribir actualiza la URL tras una pausa breve; la URL dispara la búsqueda
  useEffect(() => {
    const temporizador = setTimeout(() => cambiarParametro("q", texto.trim()), 300);
    return () => clearTimeout(temporizador);
  }, [texto, cambiarParametro]);

  useEffect(() => {
    if (!consulta) {
      setResultados(null);
      return undefined;
    }
    let vigente = true;
    setBuscando(true);
    getPublicNotesApi({ q: consulta })
      .then((lista) => vigente && setResultados(lista || []))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setBuscando(false));
    return () => {
      vigente = false;
    };
  }, [consulta]);

  const notasVisibles = useMemo(() => {
    const base = consulta ? resultados : notas;
    if (!base) return [];
    if (!elegida) return base;
    const ids = abarca(elegida);
    return base.filter((n) => categoriasDe(n).some((id) => ids.has(id)));
  }, [notas, resultados, consulta, elegida, abarca]);

  const totalPaginas = Math.max(1, Math.ceil(notasVisibles.length / NOTAS_POR_PAGINA));
  const pagina = Math.min(totalPaginas, Math.max(1, parseInt(parametros.get("pagina"), 10) || 1));
  const notasDePagina = notasVisibles.slice((pagina - 1) * NOTAS_POR_PAGINA, pagina * NOTAS_POR_PAGINA);

  const hijas = elegida ? indice.hijasDe(elegida.ficha) : indice.raices;

  const elegir = (ficha, { subir = false } = {}) => {
    cambiarParametro("categoria", ficha);
    // Desde la cuadrícula o las migas: si el catálogo quedó arriba, vuelve a su inicio
    const catalogo = document.getElementById("catalogo");
    if (subir && catalogo && catalogo.getBoundingClientRect().top < 0) catalogo.scrollIntoView({ block: "start" });
  };

  const metaNota = (nota) => {
    const firma = firmaAutor(nota.autor);
    const lugar = nombreConRuta(indice, indice.porId.get(nota.id_categoria));
    return [lugar, tiposDeCeldas(nota.celdas), firma ? `por ${firma}` : "autoría comunitaria"].filter(Boolean).join(" · ");
  };

  const conteo = (c) => {
    const subcategorias = indice.hijasDe(c.ficha).length;
    return [
      subcategorias > 0 && plural(subcategorias, "subcategoría", "subcategorías"),
      plural(notasPorFicha.get(c.ficha) || 0, "nota", "notas"),
    ]
      .filter(Boolean)
      .join(" · ");
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
          <Cargando
            texto={
              despertando
                ? "Despertando al servidor: si nadie lo ha usado en un rato, tarda hasta un par de minutos. No cierres la página…"
                : "Cargando catálogo…"
            }
          />
        ) : (
          <div className="catalogo">
            {/* Solo las raíces; las subcategorías se recorren en la columna principal */}
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
                {indice.raices.map((c) => (
                  <li key={c.id_categoria}>
                    <button type="button" aria-pressed={migas[0]?.id_categoria === c.id_categoria} onClick={() => elegir(c.ficha)}>
                      {c.nombre}
                      <span className="catalogo__flecha" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="catalogo__notas">
              <nav className="catalogo__migas" aria-label="Ubicación en el catálogo">
                <ol>
                  <li>
                    {elegida ? (
                      <button type="button" onClick={() => elegir(null, { subir: true })}>
                        Todas
                      </button>
                    ) : (
                      <span aria-current="page">Todas</span>
                    )}
                  </li>
                  {migas.map((c, i) =>
                    i < migas.length - 1 ? (
                      <li key={c.id_categoria}>
                        <button type="button" onClick={() => elegir(c.ficha, { subir: true })}>
                          {c.nombre}
                        </button>
                      </li>
                    ) : (
                      <li key={c.id_categoria}>
                        <span aria-current="page">{c.nombre}</span>
                      </li>
                    )
                  )}
                </ol>
              </nav>

              {elegida ? (
                <CabeceraCategoria
                  key={elegida.id_categoria}
                  nombre={elegida.nombre}
                  descripcion={elegida.descripcion}
                  imagen={elegida.imagen_portada}
                  enfoque={{ x: elegida.enfoque_x ?? 50, y: elegida.enfoque_y ?? 50 }}
                  meta={conteo(elegida)}
                />
              ) : (
                <CabeceraCategoria
                  nombre="Todas"
                  meta={`${plural(indice.raices.length, "categoría", "categorías")} · ${plural(notas.length, "nota", "notas")}`}
                />
              )}

              <form className="catalogo__buscador" role="search" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="catalogo-busqueda" className="catalogo__etiqueta">
                  Buscar en {elegida ? elegida.nombre : "todo el catálogo"}
                </label>
                <div className="catalogo__campo">
                  <input
                    id="catalogo-busqueda"
                    type="search"
                    className="campo__control"
                    placeholder="Buscar por título, tema, etiqueta o autor"
                    value={texto}
                    maxLength={100}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  {texto && (
                    <button type="button" className="catalogo__limpiar" onClick={() => setTexto("")}>
                      Limpiar
                    </button>
                  )}
                </div>
              </form>
              <p className="catalogo__resumen" aria-live="polite">
                {consulta &&
                  (buscando
                    ? "Buscando…"
                    : `${plural(notasVisibles.length, "nota coincide", "notas coinciden")} con «${consulta}»${elegida ? ` en «${elegida.nombre}»` : ""}.`)}
              </p>

              {!consulta && hijas.length > 0 && (
                <section className="catalogo__apartado" aria-labelledby="catalogo-subcategorias">
                  <h4 id="catalogo-subcategorias" className="catalogo__subtitulo">
                    {elegida ? "Subcategorías" : "Categorías"}
                  </h4>
                  <ol className="catalogo__rejilla">
                    {hijas.map((c, i) => (
                      <li key={c.id_categoria}>
                        <button type="button" className="catalogo__subcategoria" onClick={() => elegir(c.ficha, { subir: true })}>
                          <span
                            className={`catalogo__numero${notasPorFicha.get(c.ficha) ? " catalogo__numero--con-notas" : ""}`}
                            aria-hidden="true"
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="catalogo__subnombre">{c.nombre}</span>
                          <span className="catalogo__subconteo">{conteo(c)}</span>
                          <span className="catalogo__subflecha" aria-hidden="true">
                            →
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  {notaSugerencias && (
                    <p className="catalogo__sugerir">
                      ¿Falta una categoría? <Link to={leerNota(notaSugerencias)}>Sugiérela</Link>.
                    </p>
                  )}
                </section>
              )}

              <section className="catalogo__apartado" aria-labelledby="catalogo-lista">
                <h4 id="catalogo-lista" className="catalogo__subtitulo">
                  {consulta ? "Resultados" : elegida ? `Notas en ${elegida.nombre}` : "Todas las notas"}
                </h4>
                {consulta && !buscando && notasVisibles.length === 0 ? (
                  <p className="catalogo__vacio">
                    Ninguna nota publicada coincide. Prueba con menos palabras o con otra categoría.
                  </p>
                ) : consulta && buscando ? null : notasVisibles.length === 0 ? (
                  <p className="catalogo__vacio">
                    {elegida ? `Aún no hay notas publicadas en «${elegida.nombre}».` : "Aún no hay notas publicadas."}{" "}
                    <Link to={RUTAS.CREAR}>Escribe la primera en el taller</Link>.
                  </p>
                ) : (
                  <>
                    <ul className="catalogo__lista">
                      {notasDePagina.map((n) => (
                        <li key={n.id_documento}>
                          <Link to={leerNota(n.id_documento)} className="catalogo__titulo">
                            {n.titulo}
                          </Link>
                          <span className="catalogo__meta">{metaNota(n)}</span>
                        </li>
                      ))}
                    </ul>
                    <Paginacion pagina={pagina} total={totalPaginas} alCambiar={irAPagina} />
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
