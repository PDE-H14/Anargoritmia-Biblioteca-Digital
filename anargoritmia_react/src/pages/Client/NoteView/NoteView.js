import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { conReintentos } from "../../../api/http";
import { derivarNotaApi, getNoteApi } from "../../../api/note";
import {
  AnimacionAislada,
  DialogoCorreccion,
  EstructuraNota,
  FiguraSvg,
  MarkdownView,
  TextoEnLinea,
  analizarEstructura,
  expresionDe,
  resaltar,
} from "../../../components/Notes";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { LOGIN_PATH, editarNota, leerNota } from "../../../utils/constants";
import { firmaAutor } from "../../../utils/notas";
import "./NoteView.css";

const TIPOS = { texto: "Texto", codigo: "Código", animacion: "Animación", ejercicio: "Ejercicio" };

// Una celda de animación con figura guardada se lee como imagen fija
export const esFigura = (bloque) => bloque.tipo === "animacion" && bloque.figura && !!bloque.svg;

// Textos con Markdown de la nota, en orden de lectura (para numerar en toda la nota)
export function textosDeLaNota(bloques) {
  const campos = { texto: ["contenido"], ejercicio: ["contenido", "pista", "solucion"], codigo: ["notas"] };
  return bloques.flatMap((b) =>
    (campos[b.tipo] || []).filter((c) => b[c]?.trim()).map((c) => ({ clave: `${b.id}:${c}`, texto: b[c] }))
  );
}

// Título de una figura, ejercicio o algoritmo: con fórmulas y con punto final
function TituloCelda({ titulo }) {
  if (!titulo) return null;
  return (
    <>
      {" "}
      <TextoEnLinea>{titulo}</TextoEnLinea>
      {/[.!?]$/.test(titulo) ? "" : "."}
    </>
  );
}

/**
 * Lectura (diseño F): solo celdas públicas (el servidor filtra las privadas).
 * Si quien la abre es el autor, se pide la vista pública explícitamente para
 * que también sirva de vista previa, incluso de un borrador.
 */
export function NoteView() {
  const { id } = useParams();
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [derivando, setDerivando] = useState(false);
  const [nota, setNota] = useState(null);
  const [error, setError] = useState(null);
  // Celda sobre la que se propone una corrección (null: diálogo cerrado)
  const [corrigiendo, setCorrigiendo] = useState(null);
  const [despertando, setDespertando] = useState(false);

  useEffect(() => {
    setNota(null);
    setError(null);
    let vigente = true;
    conReintentos(() => getNoteApi(id, auth?.token, { vistaPublica: !!auth }), {
      alReintentar: () => vigente && setDespertando(true),
    })
      .then((datos) => {
        if (!vigente) return;
        setNota(datos);
        document.title = `${datos.titulo || "Nota sin título"} · Anargoritmia`;
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setDespertando(false));
    return () => {
      vigente = false;
      document.title = "Anargoritmia";
    };
  }, [id, auth]);

  if (error) {
    return (
      <div className="lectura-mensaje">
        <Aviso tipo="error" titulo="Nota no disponible">
          <p>{error}</p>
          <Boton to="/">Ir al catálogo</Boton>
        </Aviso>
      </div>
    );
  }
  if (!nota) {
    return (
      <Cargando
        texto={
          despertando
            ? "Despertando al servidor: si nadie lo ha usado en un rato, tarda hasta un par de minutos…"
            : "Cargando nota…"
        }
      />
    );
  }
  return (
    <LecturaNota
      nota={nota}
      auth={auth}
      location={location}
      navigate={navigate}
      derivando={derivando}
      setDerivando={setDerivando}
      corrigiendo={corrigiendo}
      setCorrigiendo={setCorrigiendo}
    />
  );
}

function LecturaNota({ nota, auth, location, navigate, derivando, setDerivando, corrigiendo, setCorrigiendo }) {
  // Numeración, referencias cruzadas y bibliografía de toda la nota
  const estructura = useMemo(() => analizarEstructura(textosDeLaNota(nota.bloques)), [nota.bloques]);

  const esAutor = auth && nota.autor?.id_usuario === String(auth.me?.id);
  const autoria = firmaAutor(nota.autor) || "Autoría comunitaria";
  const categoria = nota.categoria;
  // Las correcciones se proponen sobre notas publicadas y no las propone su autor
  const puedeCorregir = !!auth && !esAutor && !nota.es_borrador;
  // Crea un borrador propio a partir de esta nota y abre el taller
  const derivar = async () => {
    setDerivando(true);
    try {
      const nueva = await derivarNotaApi(nota.id_documento, auth.token);
      toast.success("Tu versión está en el taller como borrador, con la atribución a esta nota.");
      navigate(editarNota(nueva.id_documento));
    } catch (e) {
      toast.error(e.message);
      setDerivando(false);
    }
  };
  const fecha = nota.fecha_publicacion
    ? new Date(nota.fecha_publicacion).toLocaleDateString("es-MX", { dateStyle: "long" })
    : null;

  let algoritmos = 0;
  let animaciones = 0;
  let figuras = 0;
  let ejercicios = 0;

  return (
    <EstructuraNota.Provider value={estructura}>
    <article className="lectura">
      {nota.es_borrador && (
        <div className="lectura__fila">
          <div className="lectura__margen" />
          <div className="lectura__cuerpo lectura__cuerpo--aviso">
            <Aviso tipo="advertencia" titulo="Vista previa de un borrador">
              Así se verá cuando la publiques. Solo aparecen las celdas marcadas como públicas.
            </Aviso>
          </div>
        </div>
      )}

      <header className="lectura__fila lectura__cabecera">
        <div className="lectura__margen">
          {categoria && (
            <Link to={`/?categoria=${categoria.ficha}#catalogo`} className="lectura__categoria">
              § {categoria.nombre}
            </Link>
          )}
          {nota.otras_categorias?.length > 0 && (
            <p className="lectura__otras">
              También en{" "}
              {nota.otras_categorias.map((c, i) => (
                <React.Fragment key={c.id_categoria}>
                  {i > 0 && ", "}
                  <Link to={`/?categoria=${c.ficha}#catalogo`}>{c.nombre}</Link>
                </React.Fragment>
              ))}
            </p>
          )}
          <p className="lectura__ficha">{nota.ficha}</p>
          {esAutor && (
            <Link to={editarNota(nota.id_documento)} className="lectura__editar">
              Editar en el taller
            </Link>
          )}
          {!nota.es_borrador &&
            (auth ? (
              <button type="button" className="lectura__derivar" disabled={derivando} onClick={derivar}>
                {derivando ? "Creando tu versión…" : "Basar mi nota en esta"}
              </button>
            ) : (
              <Link to={LOGIN_PATH} state={{ from: location }} className="lectura__derivar">
                Basar mi nota en esta
              </Link>
            ))}
        </div>
        <div className="lectura__cuerpo">
          <h1 className="lectura__titulo">{nota.titulo || "Nota sin título"}</h1>
          <p className="lectura__firma">
            {autoria}
            {fecha && <span className="lectura__tenue"> · {fecha}</span>}
            <span className="lectura__tenue">
              {" · "}
              <a href="#nota-licencia">CC BY-SA 4.0</a>
            </span>
          </p>
          {nota.etiquetas?.length > 0 && (
            <ul className="lectura__etiquetas" aria-label="Etiquetas">
              {nota.etiquetas.map((e) => (
                <li key={e}>
                  <Link to={`/?q=${encodeURIComponent(e)}#catalogo`} title={`Buscar «${e}» en el catálogo`}>
                    #{e}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {nota.origen && (
            <p className="lectura__origen">
              Basada en{" "}
              {nota.origen.disponible === false ? (
                <>
                  «{nota.origen.titulo || "Nota sin título"}» <span className="lectura__tenue">(ya no está disponible)</span>
                </>
              ) : (
                <Link to={leerNota(nota.origen.id_documento)}>«{nota.origen.titulo || "Nota sin título"}»</Link>
              )}{" "}
              de {nota.origen.firma || "autoría comunitaria"}.
            </p>
          )}
        </div>
      </header>

      {nota.ruta?.prerrequisitos?.length > 0 && (
        <ListaRuta titulo="Antes de leer esta nota" notas={nota.ruta.prerrequisitos} numerada />
      )}

      {nota.bloques.length === 0 && (
        <div className="lectura__fila">
          <div className="lectura__margen" />
          <div className="lectura__cuerpo">
            <p className="lectura__vacia">Esta nota aún no tiene celdas públicas.</p>
          </div>
        </div>
      )}

      {nota.bloques.map((bloque, i) => {
        const contadores = {
          codigo: () => ++algoritmos,
          animacion: () => (esFigura(bloque) ? ++figuras : ++animaciones),
          ejercicio: () => ++ejercicios,
        };
        const numero = contadores[bloque.tipo]?.() ?? null;
        return (
          <FilaCelda
            key={bloque.id}
            bloque={bloque}
            indice={i}
            numero={numero}
            onCorregir={puedeCorregir ? () => setCorrigiendo(bloque.id) : null}
          />
        );
      })}

      {nota.ruta?.siguen?.length > 0 && <ListaRuta titulo="Para seguir" notas={nota.ruta.siguen} />}

      <footer className="lectura__fila lectura__notas">
        <div className="lectura__margen">
          <p className="lectura__versalitas">Licencia</p>
        </div>
        <div className="lectura__cuerpo">
          <ol className="lectura__pie">
            <li id="nota-licencia">
              Esta nota se distribuye bajo{" "}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer license">
                CC BY-SA 4.0
              </a>
              : puedes copiarla, modificarla y compartirla si atribuyes y conservas la misma licencia.
            </li>
            <li>Las ecuaciones se compilan en tu navegador con KaTeX; el servidor no procesa ni registra tu lectura.</li>
            {!auth && !nota.es_borrador && nota.bloques.length > 0 && (
              <li>
                ¿Encontraste un error?{" "}
                <Link to={LOGIN_PATH} state={{ from: location }}>
                  Inicia sesión
                </Link>{" "}
                para proponer una corrección sobre la celda donde está.
              </li>
            )}
          </ol>
        </div>
      </footer>

      {puedeCorregir && (
        <DialogoCorreccion
          abierto={!!corrigiendo}
          nota={nota}
          idBloqueInicial={corrigiendo}
          token={auth.token}
          onCerrar={() => setCorrigiendo(null)}
          onEnviada={() => {
            setCorrigiendo(null);
            toast.success("Corrección enviada. El autor la verá en su taller.");
          }}
        />
      )}
    </article>
    </EstructuraNota.Provider>
  );
}

function FilaCelda({ bloque, indice, numero, onCorregir }) {
  const { tipo, contenido, lenguaje, version, notas, archivo, titulo } = bloque;
  const nombreTipo = esFigura(bloque) ? "Figura" : TIPOS[tipo];

  return (
    <section className="lectura__fila" aria-label={`Celda ${indice + 1}: ${nombreTipo}`}>
      <div className="lectura__margen">
        <p className="lectura__versalitas">
          Celda {indice + 1} · {nombreTipo}
        </p>
        {archivo && <p className="lectura__archivo">{archivo}</p>}
        {tipo === "codigo" && (
          <>
            {lenguaje && <p className="lectura__dato">Lenguaje: {lenguaje}</p>}
            {version && <p className="lectura__dato">Intérprete: {version}</p>}
            <BotonCopiar texto={contenido} />
          </>
        )}
        {tipo === "animacion" && <BotonCopiar texto={contenido} />}
        {onCorregir && (
          <button type="button" className="lectura__corregir" onClick={onCorregir}>
            Señalar un error<span className="solo-lectores"> en la celda {indice + 1}</span>
          </button>
        )}
      </div>

      <div className="lectura__cuerpo">
        {tipo === "texto" && (
          <MarkdownView className="lectura__texto" clave={`${bloque.id}:contenido`}>
            {contenido}
          </MarkdownView>
        )}

        {tipo === "ejercicio" && (
          <section className="lectura__ejercicio" aria-label={`Ejercicio ${numero}`}>
            <p className="lectura__ejercicio-titulo">
              <strong>Ejercicio {numero}.</strong>
              {/* «Ejercicio 1» como título repetiría la numeración automática */}
              {titulo && !/^ejercicio\s*\d*\s*\.?$/i.test(titulo.trim()) && <TituloCelda titulo={titulo} />}
            </p>
            <MarkdownView className="lectura__texto" clave={`${bloque.id}:contenido`}>
              {contenido}
            </MarkdownView>
            {bloque.pista?.trim() && (
              <details className="lectura__plegable">
                <summary>Ver una pista</summary>
                <MarkdownView className="lectura__texto" clave={`${bloque.id}:pista`}>
                  {bloque.pista}
                </MarkdownView>
              </details>
            )}
            {bloque.solucion?.trim() && (
              <details className="lectura__plegable">
                <summary>Ver la solución</summary>
                <MarkdownView className="lectura__texto" clave={`${bloque.id}:solucion`}>
                  {bloque.solucion}
                </MarkdownView>
              </details>
            )}
          </section>
        )}

        {(tipo === "codigo" || tipo === "animacion") && (
          <figure className="lectura__algoritmo">
            <figcaption>
              <strong>
                {tipo === "codigo" ? "Algoritmo" : esFigura(bloque) ? "Figura" : "Animación"} {numero}.
              </strong>
              <TituloCelda titulo={titulo} />
              {tipo === "codigo" && lenguaje && ` En ${lenguaje}.`}
            </figcaption>
            {esFigura(bloque) ? (
              <>
                <FiguraSvg svg={bloque.svg} titulo={titulo || `Figura ${numero}`} />
                <details className="lectura__fuente">
                  <summary>Ver el código que la genera</summary>
                  <CodigoNumerado contenido={contenido} lenguaje="javascript" />
                </details>
              </>
            ) : tipo === "animacion" ? (
              <>
                <AnimacionAislada codigo={contenido} titulo={titulo || `Animación ${numero}`} />
                <details className="lectura__fuente">
                  <summary>Ver el código</summary>
                  <CodigoNumerado contenido={contenido} lenguaje="javascript" />
                </details>
              </>
            ) : (
              <CodigoNumerado contenido={contenido} lenguaje={lenguaje} />
            )}
          </figure>
        )}

        {tipo === "codigo" && notas?.trim() && (
          <div className="lectura__replicacion">
            <em>Notas de replicación.</em> <MarkdownView clave={`${bloque.id}:notas`}>{notas}</MarkdownView>
          </div>
        )}

      </div>
    </section>
  );
}

/** Código con números de línea y, si se conoce el lenguaje, palabras reservadas en color (igual que en el taller). */
/** Ruta de estudio: prerrequisitos (numerados) o notas que siguen a esta. */
function ListaRuta({ titulo, notas, numerada = false }) {
  const Lista = numerada ? "ol" : "ul";
  return (
    <nav className="lectura__fila lectura__ruta" aria-label={titulo}>
      <div className="lectura__margen">
        <p className="lectura__versalitas">{titulo}</p>
      </div>
      <div className="lectura__cuerpo">
        <Lista className="lectura__ruta-lista">
          {notas.map((n) => (
            <li key={n.id_documento}>
              <Link to={leerNota(n.id_documento)}>{n.titulo || "Nota sin título"}</Link>
              <span className="lectura__tenue"> · {n.firma || "autoría comunitaria"}</span>
            </li>
          ))}
        </Lista>
      </div>
    </nav>
  );
}

function CodigoNumerado({ contenido, lenguaje }) {
  const expresion = expresionDe(lenguaje);
  return (
    <pre className="lectura__codigo">
      <code>
        {contenido.split("\n").map((linea, n) => (
          <span key={n} className="lectura__linea" data-n={n + 1}>
            {resaltar(linea, expresion, "lectura__clave")}
            {"\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}

function BotonCopiar({ texto }) {
  const [estado, setEstado] = useState(null);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("Copiado");
    } catch {
      setEstado("No se pudo copiar");
    }
    setTimeout(() => setEstado(null), 2500);
  };
  return (
    <>
      <button type="button" className="lectura__copiar" onClick={copiar}>
        {estado || "Copiar código"}
      </button>
      <span className="solo-lectores" aria-live="polite">
        {estado}
      </span>
    </>
  );
}
