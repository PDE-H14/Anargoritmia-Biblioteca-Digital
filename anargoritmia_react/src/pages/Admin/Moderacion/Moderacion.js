import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { getModeracionApi, resolverCorreccionApi, retirarCorreccionApi } from "../../../api/note";
import { EncabezadoPagina } from "../../../components/App";
import { Aviso, Boton, Cargando, DialogoConfirmacion, EstadoVacio } from "../../../components/UI";
import { leerNota } from "../../../utils/constants";
import { fechaCompleta, fechaRelativa } from "../../../utils/fechas";
import { TIPOS_ERROR } from "../../../utils/notas";
import "../../../components/Notes/Correcciones/Correcciones.css";
import "./Moderacion.css";

const ESTADOS = [
  { valor: "abierta", texto: "Abiertas" },
  { valor: "atendida", texto: "Atendidas" },
  { valor: "descartada", texto: "Descartadas" },
  { valor: "", texto: "Todas" },
];
const TIPOS_CELDA = { texto: "Texto", codigo: "Código", animacion: "Animación" };
// A partir de cuántas correcciones abiertas de una misma persona conviene revisarla
const UMBRAL_ACTIVIDAD = 4;
const DIA_MS = 24 * 60 * 60 * 1000;

function diasAbierta(fecha) {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / DIA_MS));
}

/**
 * Moderación (solo administradores): todas las correcciones del sitio en
 * una vista, para atender las que ningún autor atiende o retirar las que
 * abusan del mecanismo. Las abiertas van primero, de la más antigua a la
 * más reciente.
 */
export function Moderacion() {
  const { auth } = useAuth();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState("abierta");
  const [tipo, setTipo] = useState("");
  const [porRetirar, setPorRetirar] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    getModeracionApi(auth.token)
      .then((datos) => setLista(datos || []))
      .catch((e) => setError(e.message));
  }, [auth.token]);
  useEffect(cargar, [cargar]);

  const conteo = useMemo(() => {
    const c = { abierta: 0, atendida: 0, descartada: 0, "": 0 };
    (lista || []).forEach((x) => {
      c[x.estado] += 1;
      c[""] += 1;
    });
    return c;
  }, [lista]);

  const visibles = (lista || []).filter((c) => (!estado || c.estado === estado) && (!tipo || c.tipo_error === tipo));
  const masAntigua = (lista || []).find((c) => c.estado === "abierta");

  const reemplazar = (actualizada) =>
    setLista((l) => l.map((c) => (c.id_correccion === actualizada.id_correccion ? { ...c, ...actualizada } : c)));

  const retirar = async () => {
    await retirarCorreccionApi(porRetirar.id_correccion, auth.token); // un error se muestra en el diálogo
    setLista((l) => l.filter((c) => c.id_correccion !== porRetirar.id_correccion));
    setPorRetirar(null);
    toast.success("Corrección retirada.");
  };

  const subtitulo = lista
    ? `${conteo.abierta} ${conteo.abierta === 1 ? "abierta" : "abiertas"}` +
      (masAntigua ? ` · la más antigua lleva ${diasAbierta(masAntigua.fecha_creacion)} días` : "")
    : null;

  return (
    <>
      <EncabezadoPagina titulo="Correcciones" subtitulo={subtitulo} />

      <div className="moderacion">
        <p className="moderacion__intro">
          Aquí aparecen las correcciones de todas las notas. Atiende las que su autor no ha respondido y retira las que
          no aportan o abusan del mecanismo.
        </p>

        <div className="moderacion__filtros">
          <div className="segmentado" role="group" aria-label="Estado">
            {ESTADOS.map((e) => (
              <button key={e.valor || "todas"} type="button" aria-pressed={estado === e.valor} onClick={() => setEstado(e.valor)}>
                {e.texto} <span className="moderacion__cuenta">{conteo[e.valor]}</span>
              </button>
            ))}
          </div>
          <label className="moderacion__tipo">
            <span className="solo-lectores">Tipo de error</span>
            <select className="campo__control" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {Object.entries(TIPOS_ERROR).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <Aviso tipo="error" titulo="No se pudieron cargar las correcciones">
            <p>{error}</p>
            <Boton onClick={cargar}>Reintentar</Boton>
          </Aviso>
        ) : lista === null ? (
          <Cargando texto="Cargando correcciones…" />
        ) : visibles.length === 0 ? (
          <EstadoVacio icono="exito" titulo={estado === "abierta" ? "No hay correcciones abiertas." : "No hay correcciones aquí."}>
            {estado === "abierta" ? "Todos los autores están al día." : "Prueba con otro estado o tipo de error."}
          </EstadoVacio>
        ) : (
          <ul className="panel-correcciones__lista moderacion__lista">
            {visibles.map((c) => (
              <ItemModeracion
                key={c.id_correccion}
                correccion={c}
                token={auth.token}
                onActualizada={reemplazar}
                onRetirar={() => setPorRetirar(c)}
              />
            ))}
          </ul>
        )}
      </div>

      <DialogoConfirmacion
        abierto={!!porRetirar}
        titulo="Retirar corrección"
        destructivo
        textoConfirmar="Retirar"
        onCerrar={() => setPorRetirar(null)}
        onConfirmar={retirar}
      >
        <p>
          La corrección desaparece para su autor y para quien la propuso. Úsalo para comentarios que no aportan o que
          abusan del mecanismo; para cerrar una corrección válida, márcala como atendida o descartada.
        </p>
      </DialogoConfirmacion>
    </>
  );
}

function ItemModeracion({ correccion, token, onActualizada, onRetirar }) {
  const { id_correccion, nota, celda, tipo_error, fragmento, descripcion, autor, estado, respuesta, fecha_creacion } =
    correccion;
  const [respondiendo, setRespondiendo] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const resolver = async (nuevoEstado, conRespuesta = "") => {
    setEnviando(true);
    try {
      const actualizada = await resolverCorreccionApi(id_correccion, { estado: nuevoEstado, respuesta: conRespuesta }, token);
      onActualizada(actualizada);
      setRespondiendo(null);
      setTexto("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEnviando(false);
    }
  };

  const celdaTexto = celda
    ? `Celda ${celda.indice + 1} · ${TIPOS_CELDA[celda.tipo] || celda.tipo}${celda.titulo ? ` · ${celda.titulo}` : ""}`
    : "Celda eliminada";
  const dias = diasAbierta(fecha_creacion);

  return (
    <li className={`correccion correccion--${estado}`}>
      <p className="moderacion__nota">
        {nota.existe ? (
          <a href={leerNota(nota.id_documento)} target="_blank" rel="noreferrer">
            {nota.titulo || "Nota sin título"}
            <span className="solo-lectores"> (se abre en otra pestaña)</span>
          </a>
        ) : (
          <span>Nota eliminada</span>
        )}
        <span className="moderacion__detalle">
          {" "}
          · de {nota.firma_autor || "autoría comunitaria"}
          {nota.es_borrador && " · ahora en borrador"}
        </span>
      </p>
      <p className="correccion__celda">{celdaTexto}</p>
      <p className="correccion__tipo">
        <strong>{TIPOS_ERROR[tipo_error] || tipo_error}</strong>
        {estado !== "abierta" && <span className="correccion__estado"> · {estado === "atendida" ? "Atendida" : "Descartada"}</span>}
        {estado === "abierta" && dias >= 7 && <span className="moderacion__vieja"> · {dias} días sin atender</span>}
      </p>
      {fragmento && <blockquote className="correccion__fragmento">{fragmento}</blockquote>}
      <p className="correccion__descripcion">{descripcion}</p>
      <p className="correccion__meta">
        Propuesta por {autor?.firma}
        {correccion.abiertas_del_autor >= UMBRAL_ACTIVIDAD && (
          <span className="moderacion__alerta"> · {correccion.abiertas_del_autor} abiertas en total</span>
        )}{" "}
        ·{" "}
        <time dateTime={fecha_creacion} title={fechaCompleta(fecha_creacion)}>
          {fechaRelativa(fecha_creacion)}
        </time>
      </p>
      {respuesta && <p className="correccion__respuesta">Respuesta: {respuesta}</p>}

      {!respondiendo && (
        <div className="correccion__acciones">
          {estado === "abierta" ? (
            <>
              <Boton variante="secundario" onClick={() => setRespondiendo("atendida")}>
                Atendida
              </Boton>
              <Boton variante="enlace" onClick={() => setRespondiendo("descartada")}>
                Descartar
              </Boton>
            </>
          ) : (
            <Boton variante="enlace" cargando={enviando} onClick={() => resolver("abierta")}>
              Reabrir
            </Boton>
          )}
          <Boton variante="enlace-peligro" onClick={onRetirar}>
            Retirar
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
            {respondiendo === "atendida" ? "Qué se hizo (opcional)" : "Por qué no aplica (opcional)"}
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
    </li>
  );
}
