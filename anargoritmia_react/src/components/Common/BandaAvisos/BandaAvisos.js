import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getAvisosApi } from "../../../api/avisos";
import { MarkdownView } from "../../Notes";
import { RUTA_NOVEDADES } from "../../../utils/constants";
import { TIPOS_AVISO, avisosCerrados, cerrarAviso } from "../../../utils/avisos";
import "./BandaAvisos.css";

// Los avisos se piden una vez cada dos minutos, no en cada página
const VIGENCIA_MS = 120_000;
const cache = {};

function pedirAvisos(lugar) {
  const guardado = cache[lugar];
  if (!guardado || Date.now() - guardado.hora > VIGENCIA_MS) {
    const promesa = getAvisosApi(lugar).catch(() => []); // un aviso nunca debe romper la página
    cache[lugar] = { hora: Date.now(), promesa };
  }
  return cache[lugar].promesa;
}

const EVENTO = "anargoritmia-avisos";

/** Olvida los avisos guardados y redibuja las bandas (tras crear, editar o borrar uno). */
export function refrescarAvisos() {
  Object.keys(cache).forEach((lugar) => delete cache[lugar]);
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * Banda con el aviso vigente más importante de la administración
 * (`lugar`: «publico» o «taller»). Si el aviso se puede cerrar, este
 * navegador recuerda que se cerró.
 */
export function BandaAvisos({ lugar }) {
  const [avisos, setAvisos] = useState([]);
  const [cerrados, setCerrados] = useState(avisosCerrados);

  useEffect(() => {
    let vigente = true;
    const cargar = () => pedirAvisos(lugar).then((lista) => vigente && setAvisos(Array.isArray(lista) ? lista : []));
    cargar();
    window.addEventListener(EVENTO, cargar);
    return () => {
      vigente = false;
      window.removeEventListener(EVENTO, cargar);
    };
  }, [lugar]);

  const pendientes = avisos.filter((a) => !a.cerrable || !cerrados.has(a.id_aviso));
  if (!pendientes.length) return null;
  const [aviso, ...otros] = pendientes;

  const cerrar = () => {
    cerrarAviso(aviso.id_aviso);
    setCerrados(avisosCerrados());
  };

  return (
    <aside className={`banda-avisos banda-avisos--${aviso.tipo}`} aria-label={`Aviso: ${TIPOS_AVISO[aviso.tipo]}`}>
      <div className="banda-avisos__contenido">
        <p className="banda-avisos__tipo">{TIPOS_AVISO[aviso.tipo]}</p>
        <div className="banda-avisos__texto">
          <p className="banda-avisos__titulo">{aviso.titulo}</p>
          {aviso.texto?.trim() && <MarkdownView className="banda-avisos__cuerpo">{aviso.texto}</MarkdownView>}
          <p className="banda-avisos__mas">
            <Link to={RUTA_NOVEDADES}>
              {otros.length ? `Ver ${otros.length === 1 ? "otro aviso" : `${otros.length} avisos más`} y las novedades` : "Ver todas las novedades"}
            </Link>
          </p>
        </div>
        {aviso.cerrable && (
          <button type="button" className="banda-avisos__cerrar" onClick={cerrar} aria-label={`Cerrar el aviso «${aviso.titulo}»`}>
            ×
          </button>
        )}
      </div>
    </aside>
  );
}
