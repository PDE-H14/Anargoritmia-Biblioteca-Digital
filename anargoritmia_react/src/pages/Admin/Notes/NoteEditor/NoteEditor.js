import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../../../hooks";
import { getNoteApi, createNoteApi, updateNoteApi } from "../../../../api/note";
import { getCategoriesApi } from "../../../../api/category";
import { Aviso, Boton, Cargando, DialogoConfirmacion, EtiquetaEstado, Icono } from "../../../../components/UI";
import { PanelCorrecciones } from "../../../../components/Notes";
import { NOTA_NUEVA, RUTAS, editarNota, leerNota } from "../../../../utils/constants";
import { firmaAutor, firmaPropia } from "../../../../utils/notas";
import { useAutoguardado } from "./useAutoguardado";
import { Celda, FilaNueva, TIPOS } from "./Celda";
import { DatosNota } from "./DatosNota";
import { SelectorRuta } from "./SelectorRuta";
import "./NoteEditor.css";

function nuevoId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function nuevoBloque(tipo) {
  return {
    id: nuevoId(),
    tipo,
    publico: false,
    archivo: "",
    titulo: "",
    contenido: "",
    lenguaje: tipo === "animacion" ? "javascript" : "",
    pista: "",
    solucion: "",
    version: "",
    notas: "",
  };
}

function notaVacia() {
  return { titulo: "", id_categoria: "", categorias_extra: [], etiquetas: [], es_borrador: true, fecha_publicacion: null };
}

// Campos de metadatos que devuelve el servidor y que el editor no edita
const META_SERVIDOR = [
  "id_documento",
  "ficha",
  "autor",
  "es_borrador",
  "fecha_publicacion",
  "fecha_modificacion",
  "revision",
  "celdas",
];

/**
 * Taller (diseño F): la nota es una lista de celdas de texto (Markdown +
 * KaTeX), código y animación, con datos de la nota a la derecha y barra de
 * estado al pie. Se autoguarda.
 * Ruta: /lab/notas/nueva (crea un borrador al primer guardado) o /lab/notas/:id.
 */
export function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { auth } = useAuth();
  const token = auth.token;

  const [nota, setNota] = useState(null);
  const [bloques, setBloques] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorPublicar, setErrorPublicar] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  // La nota cambió en otra pestaña o dispositivo (409): no se sigue guardando encima
  const [conflicto, setConflicto] = useState(false);
  // Títulos de los prerrequisitos para mostrarlos en «Datos de la nota»
  const [titulosRuta, setTitulosRuta] = useState({});
  // Correcciones abiertas por celda, para marcarlas en su cabecera
  const [correccionesPorCelda, setCorreccionesPorCelda] = useState({});

  // Editores de cada celda (para mover el foco con Shift+Enter)
  const editores = useRef({});
  const [enfocar, setEnfocar] = useState(null);

  // Identificador real de la nota (null hasta el primer guardado)
  const idRef = useRef(null);
  // Última revisión conocida: el servidor rechaza (409) un guardado sobre una versión vieja
  const revisionRef = useRef(null);
  // Última versión de lo editable, para que el autoguardado nunca use datos viejos
  const datosRef = useRef({});
  datosRef.current = {
    titulo: nota?.titulo ?? "",
    id_categoria: nota?.id_categoria ?? "",
    categorias_extra: nota?.categorias_extra ?? [],
    etiquetas: nota?.etiquetas ?? [],
    prerrequisitos: nota?.prerrequisitos ?? [],
    bloques,
  };

  const persistir = useCallback(async () => {
    const datos = { ...datosRef.current };
    let respuesta;
    try {
      respuesta = idRef.current
        ? await updateNoteApi(idRef.current, { ...datos, revision: revisionRef.current ?? undefined }, token)
        : await createNoteApi(datos, token);
    } catch (error) {
      if (error.status === 409) setConflicto(true);
      throw error;
    }
    revisionRef.current = respuesta.revision;

    if (!idRef.current) {
      idRef.current = respuesta.id_documento;
      // Cambia la URL sin desmontar el editor (misma ruta /lab/notas/:id)
      navigate(editarNota(respuesta.id_documento), { replace: true });
    }
    // Solo se toman los metadatos del servidor: el texto puede haber cambiado mientras tanto
    setNota((n) => {
      const actualizada = { ...n };
      META_SERVIDOR.forEach((campo) => {
        actualizada[campo] = respuesta[campo];
      });
      return actualizada;
    });
  }, [token, navigate]);

  const { estado, marcarCambio, guardarAhora, enCola, reiniciar } = useAutoguardado(persistir);

  // --- Carga ---------------------------------------------------------------
  useEffect(() => {
    getCategoriesApi()
      .then((lista) => setCategorias(lista || []))
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    if (id === idRef.current) return undefined; // la URL cambió por nuestro propio primer guardado
    let cancelado = false;

    (async () => {
      // Si se pasa de una nota a otra con cambios pendientes, primero se
      // guardan en la nota anterior (idRef y datosRef aún apuntan a ella).
      await guardarAhora();
      if (cancelado) return;

      setErrorCarga(null);
      setErrorPublicar(null);
      setConflicto(false);
      setCorreccionesPorCelda({});
      reiniciar();

      if (id === NOTA_NUEVA) {
        const primero = nuevoBloque("texto");
        idRef.current = null;
        revisionRef.current = null;
        setNota(notaVacia());
        setBloques([primero]);
        setEnfocar(primero.id);
        return;
      }

      idRef.current = id;
      setNota(null);
      try {
        const datos = await getNoteApi(id, token);
        if (cancelado) return;
        revisionRef.current = datos.revision ?? null;
        setTitulosRuta(
          Object.fromEntries((datos.ruta?.prerrequisitos || []).map((p) => [p.id_documento, p]))
        );
        setNota(datos);
        setBloques(datos.bloques || []);
      } catch (error) {
        if (!cancelado) setErrorCarga(error.message);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [id, token, reiniciar, guardarAhora]);

  // Enfoca el editor de una celda recién creada o la siguiente tras Shift+Enter
  useEffect(() => {
    if (enfocar && editores.current[enfocar]) {
      editores.current[enfocar].focus();
      setEnfocar(null);
    }
  }, [enfocar, bloques]);

  // Ctrl+S / Cmd+S guarda en lugar de abrir el diálogo del navegador
  useEffect(() => {
    const alTeclear = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        guardarRef.current?.();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const irACelda = useCallback((idBloque) => {
    document.querySelector(`[data-celda="${idBloque}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    editores.current[idBloque]?.focus({ preventScroll: true });
  }, []);

  // Aviso «N correcciones» de una celda: el panel lleva a las correcciones de esa celda.
  // `vez` cambia en cada clic para repetir el desplazamiento aunque sea la misma celda.
  const [correccionEnfocada, setCorreccionEnfocada] = useState(null);
  const verCorrecciones = useCallback((idBloque) => {
    setCorreccionEnfocada((actual) => ({ idBloque, vez: (actual?.vez || 0) + 1 }));
  }, []);

  const registrarEditor = useCallback((idBloque, elemento) => {
    if (elemento) editores.current[idBloque] = elemento;
    else delete editores.current[idBloque];
  }, []);

  // --- Edición -------------------------------------------------------------
  const cambiarMeta = (campos) => {
    setNota((n) => ({ ...n, ...campos }));
    setErrorPublicar(null);
    marcarCambio();
  };

  const editarBloques = (transformar) => {
    setBloques(transformar);
    marcarCambio();
  };

  const agregar = (tipo, posicion) => {
    const bloque = nuevoBloque(tipo);
    editarBloques((lista) => {
      const copia = [...lista];
      copia.splice(posicion, 0, bloque);
      return copia;
    });
    setEnfocar(bloque.id);
  };

  const cambiar = (idBloque, campos) => {
    editarBloques((lista) => lista.map((b) => (b.id === idBloque ? { ...b, ...campos } : b)));
    if ("publico" in campos) setErrorPublicar(null);
  };

  const mover = (idBloque, direccion) => {
    editarBloques((lista) => {
      const i = lista.findIndex((b) => b.id === idBloque);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= lista.length) return lista;
      const copia = [...lista];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  };

  const quitar = (idBloque) => editarBloques((lista) => lista.filter((b) => b.id !== idBloque));

  // Eliminar una celda vacía es inmediato; con contenido, se confirma
  const eliminar = (idBloque) => {
    const bloque = bloques.find((b) => b.id === idBloque);
    const tieneContenido = bloque && (bloque.contenido.trim() || bloque.notas?.trim());
    if (tieneContenido) setPorEliminar(bloque);
    else quitar(idBloque);
  };

  // Shift+Enter: pasa a la celda siguiente o crea una de texto al final
  const siguiente = (idBloque) => {
    const i = bloques.findIndex((b) => b.id === idBloque);
    if (i === bloques.length - 1) agregar("texto", bloques.length);
    else setEnfocar(bloques[i + 1].id);
  };

  // --- Guardado manual (botón «Guardar» y Ctrl/Cmd+S) ------------------------
  const [guardando, setGuardando] = useState(false);
  const guardarManual = async () => {
    const sinCambios = estado.fase === "limpio" || estado.fase === "guardado";
    if (sinCambios && idRef.current) {
      toast.info("No hay cambios por guardar.", { toastId: "sin-cambios" });
      return;
    }
    if (!idRef.current) marcarCambio(); // una nota nueva se crea al guardarla
    setGuardando(true);
    const ok = await guardarAhora();
    setGuardando(false);
    if (ok) toast.success("Nota guardada.", { toastId: "nota-guardada" });
  };
  const guardarRef = useRef(guardarManual);
  guardarRef.current = guardarManual;

  // --- Publicación -----------------------------------------------------------
  const cambiarPublicacion = async () => {
    setErrorPublicar(null);
    setPublicando(true);
    try {
      if (!idRef.current) marcarCambio(); // una nota nueva aún sin guardar
      const ok = await guardarAhora();
      if (!ok || !idRef.current) {
        setErrorPublicar("No se pudo guardar la nota antes de cambiar su estado.");
        return;
      }
      const respuesta = await enCola(async () => {
        try {
          const r = await updateNoteApi(
            idRef.current,
            { es_borrador: !nota.es_borrador, revision: revisionRef.current ?? undefined },
            token
          );
          revisionRef.current = r.revision;
          return r;
        } catch (error) {
          if (error.status === 409) setConflicto(true);
          throw error;
        }
      });
      setNota((n) => ({
        ...n,
        es_borrador: respuesta.es_borrador,
        fecha_publicacion: respuesta.fecha_publicacion,
        revision: respuesta.revision,
      }));
      toast.success(respuesta.es_borrador ? "La nota volvió a borrador." : "Nota publicada.");
    } catch (error) {
      setErrorPublicar(error.message);
    } finally {
      setPublicando(false);
    }
  };

  // --- Render ----------------------------------------------------------------
  if (errorCarga) {
    return (
      <div className="taller__mensaje">
        <Aviso tipo="error" titulo="No se pudo abrir la nota">
          <p>{errorCarga}</p>
          <Boton variante="secundario" icono="atras" to={RUTAS.MIS_NOTAS}>
            Volver a Mis notas
          </Boton>
        </Aviso>
      </div>
    );
  }

  if (!nota) return <Cargando texto="Cargando nota…" />;

  const titulo = nota.titulo || "Nota sin título";
  const publicas = bloques.filter((b) => b.publico).length;
  const esMia = !nota.autor || nota.autor.id_usuario === String(auth.me?.id);
  const autoria = esMia ? firmaPropia(auth.me) : firmaAutor(nota.autor) || "Autoría comunitaria";

  return (
    <div className="taller">
      <div className="taller__barra">
        <nav className="taller__migas" aria-label="Ruta">
          <Link to={RUTAS.MIS_NOTAS} className="taller__volver">
            <Icono nombre="atras" tamano={18} /> Mis notas
          </Link>
          <span aria-hidden="true">/</span>
          <span className="taller__titulo" aria-current="page">
            {titulo}
          </span>
        </nav>

        <div className="taller__acciones">
          <EtiquetaEstado borrador={nota.es_borrador} />
          {idRef.current && (
            <a href={leerNota(idRef.current)} target="_blank" rel="noreferrer" className="taller__lector">
              Vista de lector<span className="solo-lectores"> (se abre en otra pestaña)</span>
            </a>
          )}
          <Boton
            icono="guardar"
            cargando={guardando || estado.fase === "guardando"}
            onClick={guardarManual}
            title="Guardar (Ctrl+S)"
            aria-keyshortcuts="Control+S"
          >
            Guardar
          </Boton>
          <Boton
            variante={nota.es_borrador ? "principal" : "secundario"}
            cargando={publicando}
            onClick={cambiarPublicacion}
          >
            {nota.es_borrador ? "Publicar" : "Pasar a borrador"}
          </Boton>
        </div>
      </div>

      {conflicto ? (
        <div className="taller__error">
          <Aviso tipo="error" titulo="Esta nota cambió en otra pestaña o dispositivo">
            <p>
              Para no borrar esos cambios, lo que escribas aquí ya no se guarda. Copia lo que necesites conservar y
              recarga para abrir la versión más reciente.
            </p>
            <Boton variante="secundario" onClick={() => window.location.reload()}>
              Recargar la nota
            </Boton>
          </Aviso>
        </div>
      ) : estado.fase === "error" && (
        <div className="taller__error">
          <Aviso tipo="advertencia" titulo="Los últimos cambios no se guardaron">
            {estado.error} Se reintentará con tu siguiente edición.
          </Aviso>
        </div>
      )}

      {errorPublicar && (
        <div className="taller__error">
          <Aviso tipo="error" titulo="No se pudo cambiar el estado" onCerrar={() => setErrorPublicar(null)}>
            {errorPublicar}
          </Aviso>
        </div>
      )}

      <div className="taller__cuerpo">
        <section className="taller__celdas" aria-label="Celdas de la nota">
          {bloques.map((bloque, indice) => (
            <React.Fragment key={bloque.id}>
              {indice > 0 && <FilaNueva posicion={indice} onAgregar={agregar} />}
              <div data-celda={bloque.id}>
                <Celda
                  bloque={bloque}
                  indice={indice}
                  total={bloques.length}
                  correcciones={correccionesPorCelda[bloque.id] || 0}
                  onVerCorrecciones={verCorrecciones}
                  onCambiar={cambiar}
                  onMover={mover}
                  onEliminar={eliminar}
                  onSiguiente={siguiente}
                  registrarEditor={registrarEditor}
                />
              </div>
            </React.Fragment>
          ))}
          <FilaNueva posicion={bloques.length} onAgregar={agregar} />
          <p className="taller__ayuda">
            <kbd>Shift</kbd>+<kbd>Enter</kbd> pasa a la siguiente celda · <kbd>Tab</kbd> sangra el código (
            <kbd>Esc</kbd> y luego <kbd>Tab</kbd> para salir del editor) · Solo las celdas públicas se publican.
          </p>
        </section>

        <DatosNota
          titulo={nota.titulo}
          idCategoria={nota.id_categoria}
          categoriasExtra={nota.categorias_extra || []}
          etiquetas={nota.etiquetas || []}
          categorias={categorias}
          ficha={nota.ficha}
          autoria={autoria}
          esMia={esMia}
          onCambiar={cambiarMeta}
          origen={nota.origen}
          ruta={
            <SelectorRuta
              ids={nota.prerrequisitos || []}
              titulos={titulosRuta}
              idPropio={idRef.current}
              onCambiar={(ids, titulos) => {
                setTitulosRuta(titulos);
                cambiarMeta({ prerrequisitos: ids });
              }}
            />
          }
        >
          <PanelCorrecciones
            idNota={idRef.current}
            token={token}
            bloques={bloques}
            onIrACelda={irACelda}
            onConteo={setCorreccionesPorCelda}
            mostrarAlCargar={hash === "#correcciones"}
            enfocada={correccionEnfocada}
          />
        </DatosNota>
      </div>

      <BarraEstado
        ficha={nota.ficha}
        celdas={bloques.length}
        publicas={publicas}
        estado={estado}
        conflicto={conflicto}
        onReintentar={guardarAhora}
        onVerConflicto={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />

      <DialogoConfirmacion
        abierto={!!porEliminar}
        titulo="Eliminar celda"
        destructivo
        textoConfirmar="Eliminar celda"
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={() => {
          quitar(porEliminar.id);
          setPorEliminar(null);
        }}
      >
        <p>
          ¿Eliminar esta celda de {TIPOS[porEliminar?.tipo]?.toLowerCase()} y su contenido? Si ya se guardó,
          desaparece de la nota en el siguiente guardado.
        </p>
      </DialogoConfirmacion>
    </div>
  );
}

/** Barra de estado del taller: modo, ficha, conteo y autoguardado. */
function BarraEstado({ ficha, celdas, publicas, estado, conflicto, onReintentar, onVerConflicto }) {
  const { fase, hora, error } = estado;
  const horaTexto = hora?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  let guardado;
  if (fase === "error") guardado = "no se guardó";
  else if (fase === "guardando") guardado = "guardando…";
  else if (fase === "pendiente") guardado = "cambios sin guardar";
  else guardado = hora ? `guardado ${horaTexto}` : "sin cambios";

  return (
    <footer className="barra-estado">
      <span className="barra-estado__modo">-- EDITANDO --</span>
      <span className="barra-estado__ficha">{ficha || "sin-ficha"}</span>
      <span>
        {celdas} {celdas === 1 ? "celda" : "celdas"} · {publicas} {publicas === 1 ? "pública" : "públicas"}
      </span>
      <span className={`barra-estado__guardado ${fase === "error" ? "es-error" : ""}`} aria-live="polite">
        {guardado}
        {conflicto ? (
          <>
            {" "}
            <button type="button" className="barra-estado__reintentar" onClick={onVerConflicto}>
              la nota cambió en otro lado
            </button>
          </>
        ) : fase === "error" && (
          <>
            {" "}
            <span className="solo-lectores">: {error}</span>
            <button type="button" className="barra-estado__reintentar" title={error} onClick={onReintentar}>
              reintentar
            </button>
          </>
        )}
        <span aria-hidden="true"> · utf-8</span>
      </span>
    </footer>
  );
}
