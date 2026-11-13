import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getCorreccionesApi, resolverCorreccionApi } from "../../../api/note";
import { Aviso, Boton, Cargando } from "../../UI";
import { TIPOS_ERROR } from "../../../utils/notas";
import { fechaCompleta, fechaRelativa } from "../../../utils/fechas";
import { etiquetaCelda } from "./etiquetas";
import "./Correcciones.css";

const ESTADOS = { abierta: "Abierta", atendida: "Atendida", descartada: "Descartada" };

/**
 * Correcciones de lectores sobre la nota, para su autor (en el taller).
 * `bloques` son las celdas actuales del taller: si la celda corregida ya no
 * existe se indica. `onConteo` recibe {id_bloque: abiertas} para marcar las celdas.
 */
export function PanelCorrecciones({ idNota, token, bloques, onIrACelda, onConteo, mostrarAlCargar = false }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [verTodas, setVerTodas] = useState(false);

  const cargar = useCallback(() => {
    if (!idNota) {
      setLista([]);
      return;
    }
    setError(null);
    getCorreccionesApi(idNota, token)
      .then((datos) => setLista(datos || []))
      .catch((e) => setError(e.message));
  }, [idNota, token]);
  useEffect(cargar, [cargar]);

  useEffect(() => {
    const conteo = {};
    (lista || []).filter((c) => c.estado === "abierta").forEach((c) => {
      conteo[c.id_bloque] = (conteo[c.id_bloque] || 0) + 1;
    });
    onConteo?.(conteo);
  }, [lista, onConteo]);

  // Al llegar desde Mis notas («N correcciones»), se muestra una vez que cargó la lista
  useEffect(() => {
    if (mostrarAlCargar && lista) {
      document.getElementById("correcciones")?.scrollIntoView({ block: "start" });
    }
  }, [mostrarAlCargar, lista]);

  const reemplazar = (actualizada) =>
    setLista((l) => l.map((c) => (c.id_correccion === actualizada.id_correccion ? actualizada : c)));

  if (!idNota) return null;

  const abiertas = (lista || []).filter((c) => c.estado === "abierta");
  const visibles = verTodas ? lista || [] : abiertas;

  return (
    <section className="panel-correcciones" id="correcciones" aria-labelledby="panel-correcciones-titulo">
      <div className="panel-correcciones__cabecera">
        <h2 id="panel-correcciones-titulo" className="datos-nota__titulo">
          Correcciones{abiertas.length > 0 && <span className="panel-correcciones__cuenta">{abiertas.length}</span>}
        </h2>
        {lista && lista.length > abiertas.length && (
          <button type="button" className="panel-correcciones__filtro" onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? "Solo abiertas" : `Ver todas (${lista.length})`}
          </button>
        )}
      </div>

      {error ? (
        <Aviso tipo="error">
          {error}{" "}
          <button type="button" className="panel-correcciones__filtro" onClick={cargar}>
            Reintentar
          </button>
        </Aviso>
      ) : lista === null ? (
        <Cargando texto="Cargando correcciones…" enLinea />
      ) : visibles.length === 0 ? (
        <p className="datos-nota__nota">
          {lista.length === 0
            ? "Cuando un lector señale un error en una celda pública, aparecerá aquí."
            : "No hay correcciones abiertas."}
        </p>
      ) : (
        <ul className="panel-correcciones__lista">
          {visibles.map((c) => (
            <ItemCorreccion
              key={c.id_correccion}
              correccion={c}
              bloques={bloques}
              token={token}
              onIrACelda={onIrACelda}
              onActualizada={reemplazar}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemCorreccion({ correccion, bloques, token, onIrACelda, onActualizada }) {
  const { id_correccion, id_bloque, tipo_error, fragmento, descripcion, autor, estado, respuesta, fecha_creacion } =
    correccion;
  const [respondiendo, setRespondiendo] = useState(null); // "atendida" | "descartada"
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const indice = bloques.findIndex((b) => b.id === id_bloque);
  const celda = indice >= 0 ? etiquetaCelda(bloques[indice], indice) : "Celda eliminada";

  const resolver = async (nuevoEstado, conRespuesta = "") => {
    setEnviando(true);
    try {
      const actualizada = await resolverCorreccionApi(id_correccion, { estado: nuevoEstado, respuesta: conRespuesta }, token);
      onActualizada(actualizada);
      setRespondiendo(null);
      setTexto("");
      if (nuevoEstado !== "abierta") toast.success(nuevoEstado === "atendida" ? "Corrección atendida." : "Corrección descartada.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <li className={`correccion correccion--${estado}`}>
      <p className="correccion__celda">
        {indice >= 0 ? (
          <button type="button" onClick={() => onIrACelda?.(id_bloque)} title="Ir a la celda">
            {celda}
          </button>
        ) : (
          <span>{celda}</span>
        )}
      </p>
      <p className="correccion__tipo">
        <strong>{TIPOS_ERROR[tipo_error] || tipo_error}</strong>
        {estado !== "abierta" && <span className="correccion__estado"> · {ESTADOS[estado]}</span>}
      </p>
      {fragmento && <blockquote className="correccion__fragmento">{fragmento}</blockquote>}
      <p className="correccion__descripcion">{descripcion}</p>
      <p className="correccion__meta">
        {autor?.firma} ·{" "}
        <time dateTime={fecha_creacion} title={fechaCompleta(fecha_creacion)}>
          {fechaRelativa(fecha_creacion)}
        </time>
      </p>
      {respuesta && <p className="correccion__respuesta">Tu respuesta: {respuesta}</p>}

      {estado === "abierta" && !respondiendo && (
        <div className="correccion__acciones">
          <Boton variante="secundario" onClick={() => setRespondiendo("atendida")}>
            Atendida
          </Boton>
          <Boton variante="enlace" onClick={() => setRespondiendo("descartada")}>
            Descartar
          </Boton>
        </div>
      )}

      {respondiendo && (
        <form
          className="correccion__formulario"
          onSubmit={(e) => {
            e.preventDefault();
            resolver(respondiendo, texto);
          }}
        >
          <label className="campo__etiqueta" htmlFor={`respuesta-${id_correccion}`}>
            {respondiendo === "atendida" ? "Qué cambiaste (opcional)" : "Por qué no aplica (opcional)"}
          </label>
          <textarea
            id={`respuesta-${id_correccion}`}
            className="campo__control"
            rows={2}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="correccion__acciones">
            <Boton variante="principal" type="submit" cargando={enviando}>
              {respondiendo === "atendida" ? "Marcar atendida" : "Descartar"}
            </Boton>
            <Boton variante="enlace" onClick={() => setRespondiendo(null)} disabled={enviando}>
              Cancelar
            </Boton>
          </div>
        </form>
      )}

      {estado !== "abierta" && (
        <div className="correccion__acciones">
          <Boton variante="enlace" cargando={enviando} onClick={() => resolver("abierta")}>
            Reabrir
          </Boton>
        </div>
      )}
    </li>
  );
}
