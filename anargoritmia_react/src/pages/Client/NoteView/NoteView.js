import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../../hooks";
import { getNoteApi } from "../../../api/note";
import { getCategoriesApi } from "../../../api/category";
import { MarkdownView } from "../../../components/Notes";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { editarNota } from "../../../utils/constants";
import "./NoteView.css";

const TIPOS = { texto: "Texto", codigo: "Código", animacion: "Animación" };
const ALIAS_COMUNIDAD = "Comunidad Anargoritmia";

/**
 * Lectura (diseño F): solo celdas públicas (el servidor filtra las privadas).
 * Si quien la abre es el autor, se pide la vista pública explícitamente para
 * que también sirva de vista previa, incluso de un borrador.
 */
export function NoteView() {
  const { id } = useParams();
  const { auth } = useAuth();
  const [nota, setNota] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setNota(null);
    setError(null);
    getNoteApi(id, auth?.token, { vistaPublica: !!auth })
      .then((datos) => {
        setNota(datos);
        document.title = `${datos.titulo || "Nota sin título"} · Anargoritmia`;
      })
      .catch((e) => setError(e.message));
    return () => {
      document.title = "Anargoritmia";
    };
  }, [id, auth]);

  useEffect(() => {
    if (!nota?.id_categoria) return;
    getCategoriesApi()
      .then((lista) => setCategoria((lista || []).find((c) => c.id_categoria === nota.id_categoria) || null))
      .catch(() => setCategoria(null));
  }, [nota?.id_categoria]);

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
  if (!nota) return <Cargando texto="Cargando nota…" />;

  const esAutor = auth && nota.autor?.id_usuario === String(auth.me?.id);
  const alias = nota.autor?.alias;
  // PENDIENTE (rediseño de notas): la API solo entrega el alias, no el nombre completo
  const autoria = !alias || alias === ALIAS_COMUNIDAD ? "Autoría comunitaria" : alias;
  const fecha = nota.fecha_publicacion
    ? new Date(nota.fecha_publicacion).toLocaleDateString("es-MX", { dateStyle: "long" })
    : null;

  let algoritmos = 0;
  let animaciones = 0;

  return (
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
          <p className="lectura__ficha">{nota.ficha}</p>
          {esAutor && (
            <Link to={editarNota(nota.id_documento)} className="lectura__editar">
              Editar en el taller
            </Link>
          )}
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
        </div>
      </header>

      {nota.bloques.length === 0 && (
        <div className="lectura__fila">
          <div className="lectura__margen" />
          <div className="lectura__cuerpo">
            <p className="lectura__vacia">Esta nota aún no tiene celdas públicas.</p>
          </div>
        </div>
      )}

      {nota.bloques.map((bloque, i) => {
        const numero = bloque.tipo === "codigo" ? ++algoritmos : bloque.tipo === "animacion" ? ++animaciones : null;
        return <FilaCelda key={bloque.id} bloque={bloque} indice={i} numero={numero} />;
      })}

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
          </ol>
        </div>
      </footer>
    </article>
  );
}

function FilaCelda({ bloque, indice, numero }) {
  const { tipo, contenido, lenguaje, version, notas } = bloque;

  return (
    <section className="lectura__fila" aria-label={`Celda ${indice + 1}: ${TIPOS[tipo]}`}>
      <div className="lectura__margen">
        <p className="lectura__versalitas">
          Celda {indice + 1} · {TIPOS[tipo]}
        </p>
        {tipo === "codigo" && (
          <>
            {lenguaje && <p className="lectura__dato">Lenguaje: {lenguaje}</p>}
            {version && <p className="lectura__dato">Intérprete: {version}</p>}
            <BotonCopiar texto={contenido} />
          </>
        )}
        {tipo === "animacion" && <BotonCopiar texto={contenido} />}
      </div>

      <div className="lectura__cuerpo">
        {tipo === "texto" && <MarkdownView className="lectura__texto">{contenido}</MarkdownView>}

        {tipo !== "texto" && (
          <figure className="lectura__algoritmo">
            {/* PENDIENTE (rediseño de notas): título propio de cada algoritmo */}
            <figcaption>
              <strong>
                {tipo === "codigo" ? "Algoritmo" : "Animación"} {numero}.
              </strong>
              {tipo === "codigo" && lenguaje && ` En ${lenguaje}.`}
            </figcaption>
            <pre className="lectura__codigo">
              <code>
                {contenido.split("\n").map((linea, n) => (
                  <span key={n} className="lectura__linea" data-n={n + 1}>
                    {linea}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
          </figure>
        )}

        {tipo === "codigo" && notas?.trim() && (
          <div className="lectura__replicacion">
            <em>Notas de replicación.</em> <MarkdownView>{notas}</MarkdownView>
          </div>
        )}

        {tipo === "animacion" && (
          <p className="lectura__replicacion">
            <em>Animación.</em> Su ejecución en un entorno aislado llegará en una próxima versión; por ahora se muestra el
            código.
          </p>
        )}
      </div>
    </section>
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
