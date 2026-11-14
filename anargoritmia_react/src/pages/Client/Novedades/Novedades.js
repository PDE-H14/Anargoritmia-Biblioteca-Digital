import React, { useEffect, useState } from "react";

import { getHistorialAvisosApi } from "../../../api/avisos";
import { conReintentos } from "../../../api/http";
import { MarkdownView } from "../../../components/Notes";
import { Aviso, Boton, Cargando } from "../../../components/UI";
import { TIPOS_AVISO, estadoAviso, fechaCortaAviso } from "../../../utils/avisos";
import "./Novedades.css";

/** Novedades: historial de avisos de la administración (cambios, mantenimientos, reconocimientos). */
export function Novedades() {
  const [avisos, setAvisos] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    document.title = "Novedades · Anargoritmia";
    return () => {
      document.title = "Anargoritmia";
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    setError(null);
    conReintentos(() => getHistorialAvisosApi())
      .then((lista) => vigente && setAvisos(lista || []))
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [intento]);

  return (
    <div className="novedades">
      <h1 className="novedades__titulo">Novedades</h1>
      <p className="novedades__intro">
        Cambios en Anargoritmia, mantenimientos, avisos importantes y reconocimientos a quienes construyen el procomún.
      </p>
      {error ? (
        <Aviso tipo="error" titulo="No se pudieron cargar las novedades">
          <p>{error}</p>
          <Boton onClick={() => setIntento((n) => n + 1)}>Reintentar</Boton>
        </Aviso>
      ) : !avisos ? (
        <Cargando texto="Cargando novedades…" />
      ) : avisos.length === 0 ? (
        <p className="novedades__vacio">Todavía no hay novedades.</p>
      ) : (
        <ol className="novedades__lista">
          {avisos.map((a) => (
            <li key={a.id_aviso} id={`aviso-${a.id_aviso}`} className={`novedades__item novedades__item--${a.tipo}`}>
              <p className="novedades__meta">
                <span className="novedades__tipo">{TIPOS_AVISO[a.tipo]}</span>
                <time dateTime={a.desde || a.creado}>{fechaCortaAviso(a.desde || a.creado)}</time>
                {estadoAviso(a) === "vigente" && a.hasta && <span>vigente hasta el {fechaCortaAviso(a.hasta)}</span>}
              </p>
              <h2 className="novedades__nombre">{a.titulo}</h2>
              {a.texto?.trim() && <MarkdownView className="novedades__texto">{a.texto}</MarkdownView>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
