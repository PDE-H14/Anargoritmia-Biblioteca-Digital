import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../hooks";
import { getMyNotesApi, getPublicNotesApi } from "../../api/note";
import { EncabezadoPagina } from "../../components/App";
import { Aviso, Boton, Cargando, EstadoVacio, EtiquetaEstado, Tarjeta } from "../../components/UI";
import { RUTAS, editarNota, leerNota } from "../../utils/constants";
import { fechaCompleta, fechaRelativa } from "../../utils/fechas";
import { firmaAutor, tiposDeCeldas } from "../../utils/notas";
import "./HomeAdmin.css";

const CUANTAS = 5;

/** Recientes (diseño F): tus últimas notas y lo último publicado en la comunidad. */
export function HomeAdmin() {
  const { auth } = useAuth();
  const [mias, setMias] = useState(null);
  const [comunidad, setComunidad] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    Promise.all([getMyNotesApi(auth.token), getPublicNotesApi({ limite: CUANTAS })])
      .then(([propias, publicadas]) => {
        setMias(propias.slice(0, CUANTAS));
        setComunidad(publicadas.slice(0, CUANTAS));
      })
      .catch((e) => setError(e.message));
  }, [auth.token]);

  useEffect(cargar, [cargar]);

  const nombre = auth.me?.first_name || auth.me?.username;

  return (
    <>
      <EncabezadoPagina
        titulo="Recientes"
        subtitulo={nombre ? `Hola, ${nombre}. Esto es lo último en tu taller y en la biblioteca.` : null}
        acciones={
          <Boton variante="principal" icono="mas" to={RUTAS.CREAR}>
            Nueva nota
          </Boton>
        }
      />

      <div className="recientes">
        {error ? (
          <Aviso tipo="error" titulo="No se pudo cargar la actividad reciente">
            <p>{error}</p>
            <Boton onClick={cargar}>Reintentar</Boton>
          </Aviso>
        ) : !mias ? (
          <Cargando texto="Cargando actividad…" />
        ) : (
          <>
            <Tarjeta
              titulo="Tus notas"
              acciones={
                mias.length > 0 && (
                  <Boton variante="enlace" to={RUTAS.MIS_NOTAS}>
                    Ver todas
                  </Boton>
                )
              }
            >
              {mias.length === 0 ? (
                <EstadoVacio
                  icono="notas"
                  titulo="Todavía no tienes notas."
                  accion={
                    <Boton variante="principal" icono="mas" to={RUTAS.CREAR}>
                      Escribir la primera
                    </Boton>
                  }
                />
              ) : (
                <ul className="recientes__lista">
                  {mias.map((n) => {
                    const fecha = n.fecha_modificacion || n.fecha_publicacion;
                    return (
                      <li key={n.id_documento} className="recientes__item">
                        <div className="recientes__principal">
                          <Link to={editarNota(n.id_documento)} className="recientes__titulo">
                            {n.titulo || "Nota sin título"}
                          </Link>
                          <span className="recientes__meta">
                            {n.celdas.publicas} de {n.celdas.total} celdas públicas ·{" "}
                            <time dateTime={fecha || undefined} title={fechaCompleta(fecha)}>
                              {fechaRelativa(fecha)}
                            </time>
                          </span>
                        </div>
                        <EtiquetaEstado borrador={n.es_borrador} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta titulo="Publicadas en la comunidad">
              {comunidad.length === 0 ? (
                <p className="recientes__vacio">Aún no hay notas publicadas en la biblioteca.</p>
              ) : (
                <ul className="recientes__lista">
                  {comunidad.map((n) => (
                    <li key={n.id_documento} className="recientes__item">
                      <div className="recientes__principal">
                        <a href={leerNota(n.id_documento)} className="recientes__titulo">
                          {n.titulo}
                        </a>
                        <span className="recientes__meta recientes__meta--mono">
                          {tiposDeCeldas(n.celdas)} · {firmaAutor(n.autor) ? `por ${firmaAutor(n.autor)}` : "autoría comunitaria"} ·{" "}
                          <time dateTime={n.fecha_publicacion || undefined} title={fechaCompleta(n.fecha_publicacion)}>
                            {fechaRelativa(n.fecha_publicacion)}
                          </time>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </>
        )}
      </div>
    </>
  );
}
