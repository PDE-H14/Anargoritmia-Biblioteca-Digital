import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../../../hooks";
import { getMyNotesApi, deleteNoteApi } from "../../../../api/note";
import { getCategoriesApi } from "../../../../api/category";
import { EncabezadoPagina } from "../../../../components/App";
import {
  Aviso,
  Boton,
  Cargando,
  DialogoConfirmacion,
  EstadoVacio,
  EtiquetaEstado,
  Tabla,
} from "../../../../components/UI";
import { RUTAS, editarNota, leerNota } from "../../../../utils/constants";
import { fechaCompleta, fechaRelativa } from "../../../../utils/fechas";
import "./MyNotes.css";

/** Mis notas (diseño F): notas del usuario, borradores incluidos, más recientes primero. */
export function MyNotes() {
  const { auth } = useAuth();
  const [notas, setNotas] = useState(null);
  const [error, setError] = useState(null);
  const [categorias, setCategorias] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    getMyNotesApi(auth.token)
      .then(setNotas)
      .catch((e) => setError(e.message));
  }, [auth.token]);

  useEffect(() => {
    cargar();
    getCategoriesApi()
      .then((lista) => setCategorias(Object.fromEntries((lista || []).map((c) => [c.id_categoria, c.nombre]))))
      .catch(() => setCategorias({}));
  }, [cargar]);

  const eliminar = async () => {
    await deleteNoteApi(porEliminar.id_documento, auth.token); // si falla, el diálogo muestra el error
    toast.success("Nota eliminada.");
    setPorEliminar(null);
    cargar();
  };

  const publicadas = notas?.filter((n) => !n.es_borrador).length ?? 0;
  const subtitulo =
    notas && notas.length > 0
      ? `${notas.length} ${notas.length === 1 ? "nota" : "notas"} · ${publicadas} ${publicadas === 1 ? "publicada" : "publicadas"}`
      : null;

  return (
    <>
      <EncabezadoPagina
        titulo="Mis notas"
        subtitulo={subtitulo}
        acciones={
          <Boton variante="principal" icono="mas" to={RUTAS.CREAR}>
            Nueva nota
          </Boton>
        }
      />

      <div className="mis-notas">
        {error ? (
          <Aviso tipo="error" titulo="No se pudieron cargar tus notas">
            <p>{error}</p>
            <Boton variante="secundario" onClick={cargar}>
              Reintentar
            </Boton>
          </Aviso>
        ) : notas === null ? (
          <Cargando texto="Cargando notas…" />
        ) : notas.length === 0 ? (
          <EstadoVacio
            icono="notas"
            titulo="Todavía no tienes notas."
            accion={
              <Boton variante="principal" icono="mas" to={RUTAS.CREAR}>
                Escribir la primera
              </Boton>
            }
          >
            Se guardan solas mientras escribes, y tú decides qué celdas se publican.
          </EstadoVacio>
        ) : (
          <Tabla descripcion="Mis notas">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Estado</th>
                <th scope="col">Categoría</th>
                <th scope="col">Celdas públicas</th>
                <th scope="col">Última modificación</th>
                <th scope="col" className="tabla__acciones">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {notas.map((nota) => {
                const { publicas, total } = nota.celdas;
                const correcciones = nota.correcciones_abiertas || 0;
                const titulo = nota.titulo || "Nota sin título";
                const fecha = nota.fecha_modificacion || nota.fecha_publicacion;
                const categoria = categorias[nota.id_categoria];
                return (
                  <tr key={nota.id_documento}>
                    <td className="mis-notas__titulo">
                      <Link to={editarNota(nota.id_documento)}>{titulo}</Link>
                      {correcciones > 0 && (
                        <Link
                          to={`${editarNota(nota.id_documento)}#correcciones`}
                          className="mis-notas__correcciones"
                          title="Correcciones de lectores por atender"
                        >
                          {correcciones} {correcciones === 1 ? "corrección" : "correcciones"}
                        </Link>
                      )}
                    </td>
                    <td>
                      <EtiquetaEstado borrador={nota.es_borrador} />
                    </td>
                    <td className={categoria ? "" : "tabla__secundario"}>{categoria || "Sin categoría"}</td>
                    <td>
                      {publicas} de {total}
                    </td>
                    <td className="mis-notas__fecha">
                      <time dateTime={fecha || undefined} title={fechaCompleta(fecha)}>
                        {fechaRelativa(fecha)}
                      </time>
                    </td>
                    <td className="tabla__acciones">
                      <Boton variante="enlace" to={editarNota(nota.id_documento)} aria-label={`Editar «${titulo}»`}>
                        Editar
                      </Boton>
                      <Boton
                        variante="enlace"
                        href={leerNota(nota.id_documento)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Ver «${titulo}» como lector (se abre en otra pestaña)`}
                      >
                        Ver
                      </Boton>
                      <Boton
                        variante="enlace-peligro"
                        onClick={() => setPorEliminar(nota)}
                        aria-label={`Eliminar «${titulo}»`}
                      >
                        Eliminar
                      </Boton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </div>

      <DialogoConfirmacion
        abierto={!!porEliminar}
        titulo="Eliminar nota"
        destructivo
        textoConfirmar="Eliminar"
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={eliminar}
      >
        <p>
          ¿Eliminar <strong>{porEliminar?.titulo || "Nota sin título"}</strong>? Se borran todas sus celdas,
          públicas y privadas. No se puede deshacer.
        </p>
      </DialogoConfirmacion>
    </>
  );
}
