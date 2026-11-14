import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { borrarAvisoApi, crearAvisoApi, editarAvisoApi, getTodosAvisosApi } from "../../../api/avisos";
import { EncabezadoPagina } from "../../../components/App";
import { refrescarAvisos } from "../../../components/Common";
import { MarkdownView } from "../../../components/Notes";
import { Aviso, Boton, Campo, Cargando, Casilla, Dialogo, DialogoConfirmacion, EstadoVacio } from "../../../components/UI";
import { LUGARES_AVISO, TIPOS_AVISO, estadoAviso, fechaAviso } from "../../../utils/avisos";
import "./Avisos.css";

const ESTADOS = { vigente: "Vigente", programado: "Programado", terminado: "Terminado" };

/** Avisos de la administración (solo admins): novedades, mantenimientos, notas importantes y reconocimientos. */
export function Avisos() {
  const { auth } = useAuth();
  const [avisos, setAvisos] = useState(null);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null); // {} nuevo o el aviso a editar
  const [porBorrar, setPorBorrar] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    getTodosAvisosApi(auth.token)
      .then(setAvisos)
      .catch((e) => setError(e.message));
  }, [auth.token]);
  useEffect(cargar, [cargar]);

  const alGuardar = (nuevo) => {
    setEditando(null);
    refrescarAvisos();
    toast.success(nuevo ? "Aviso creado." : "Aviso actualizado.");
    cargar();
  };

  const borrar = async () => {
    await borrarAvisoApi(porBorrar.id_aviso, auth.token);
    toast.success("Aviso borrado.");
    setPorBorrar(null);
    refrescarAvisos();
    cargar();
  };

  const vigentes = avisos?.filter((a) => estadoAviso(a) === "vigente").length ?? 0;

  return (
    <>
      <EncabezadoPagina
        titulo="Avisos"
        subtitulo={avisos ? `${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"} · ${vigentes} vigentes` : null}
        acciones={
          <Boton variante="principal" icono="mas" onClick={() => setEditando({})}>
            Nuevo aviso
          </Boton>
        }
      />
      <div className="avisos-admin">
        <p className="avisos-admin__ayuda">
          Cambios subidos, mantenimientos, notas importantes y reconocimientos. El aviso vigente más importante aparece en
          una banda arriba del sitio o del taller; todos los publicados quedan en la página «Novedades».
        </p>
        {error ? (
          <Aviso tipo="error" titulo="No se pudieron cargar los avisos">
            <p>{error}</p>
            <Boton onClick={cargar}>Reintentar</Boton>
          </Aviso>
        ) : !avisos ? (
          <Cargando texto="Cargando avisos…" />
        ) : avisos.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay avisos">
            Crea el primero, por ejemplo para anunciar la ronda de pruebas o un mantenimiento.
          </EstadoVacio>
        ) : (
          <ul className="avisos-admin__lista">
            {avisos.map((a) => {
              const estado = estadoAviso(a);
              return (
                <li key={a.id_aviso} className={`avisos-admin__item avisos-admin__item--${a.tipo}`}>
                  <div className="avisos-admin__cabeza">
                    <span className="avisos-admin__tipo">{TIPOS_AVISO[a.tipo]}</span>
                    <span className={`avisos-admin__estado avisos-admin__estado--${estado}`}>{ESTADOS[estado]}</span>
                    {a.fijado && <span className="avisos-admin__marca">Fijado</span>}
                  </div>
                  <p className="avisos-admin__titulo">{a.titulo}</p>
                  <p className="avisos-admin__meta">
                    {a.lugares.map((l) => LUGARES_AVISO[l]).join(" y ")} ·{" "}
                    {a.desde ? `desde ${fechaAviso(a.desde)}` : "desde que se creó"} ·{" "}
                    {a.hasta ? `hasta ${fechaAviso(a.hasta)}` : "sin fecha de fin"}
                    {!a.cerrable && " · no se puede cerrar"}
                  </p>
                  <div className="avisos-admin__acciones">
                    <Boton variante="enlace" onClick={() => setEditando(a)}>
                      Editar
                    </Boton>
                    <Boton variante="enlace-peligro" onClick={() => setPorBorrar(a)}>
                      Borrar
                    </Boton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editando && (
        <FormularioAviso aviso={editando} token={auth.token} onCerrar={() => setEditando(null)} onGuardado={alGuardar} />
      )}

      <DialogoConfirmacion
        abierto={!!porBorrar}
        titulo="Borrar aviso"
        destructivo
        textoConfirmar="Borrar aviso"
        onCerrar={() => setPorBorrar(null)}
        onConfirmar={borrar}
      >
        <p>
          ¿Borrar «{porBorrar?.titulo}»? Deja de verse en la banda y en «Novedades». No se puede deshacer; si solo quieres
          que deje de mostrarse, ponle una fecha de fin.
        </p>
      </DialogoConfirmacion>
    </>
  );
}

// ISO del servidor ↔ valor de <input type="datetime-local"> (hora local)
function aLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
}
const aIso = (valor) => (valor ? new Date(valor).toISOString() : null);

function FormularioAviso({ aviso, token, onCerrar, onGuardado }) {
  const nuevo = !aviso.id_aviso;
  const [valores, setValores] = useState({
    titulo: aviso.titulo || "",
    texto: aviso.texto || "",
    tipo: aviso.tipo || "novedad",
    desde: aLocal(aviso.desde),
    hasta: aLocal(aviso.hasta),
    lugares: aviso.lugares || ["publico", "taller"],
    fijado: !!aviso.fijado,
    cerrable: aviso.cerrable ?? true,
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo, valor) => setValores((v) => ({ ...v, [campo]: valor }));
  const alternarLugar = (lugar, activo) =>
    cambiar("lugares", activo ? [...new Set([...valores.lugares, lugar])] : valores.lugares.filter((l) => l !== lugar));

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!valores.titulo.trim()) encontrados.titulo = "Escribe un título.";
    if (!valores.lugares.length) encontrados.lugares = "Elige al menos un lugar.";
    if (valores.desde && valores.hasta && new Date(valores.hasta) <= new Date(valores.desde)) {
      encontrados.hasta = "El fin debe ser posterior al inicio.";
    }
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    const datos = { ...valores, titulo: valores.titulo.trim(), desde: aIso(valores.desde), hasta: aIso(valores.hasta) };
    setEnviando(true);
    try {
      if (nuevo) await crearAvisoApi(datos, token);
      else await editarAvisoApi(aviso.id_aviso, datos, token);
      onGuardado(nuevo);
    } catch (error) {
      setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo
      abierto
      amplio
      cerrarFuera={false}
      titulo={nuevo ? "Nuevo aviso" : "Editar aviso"}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" form="form-aviso" variante="principal" cargando={enviando}>
            {nuevo ? "Publicar aviso" : "Guardar cambios"}
          </Boton>
        </>
      }
    >
      <form id="form-aviso" className="dialogo__formulario" onSubmit={enviar} noValidate>
        <div className="dialogo__fila">
          <Campo id="aviso-tipo" etiqueta="Tipo">
            <select value={valores.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
              {Object.entries(TIPOS_AVISO).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="aviso-titulo" etiqueta="Título" error={errores.titulo}>
            <input maxLength={120} value={valores.titulo} onChange={(e) => cambiar("titulo", e.target.value)} />
          </Campo>
        </div>
        <Campo id="aviso-texto" etiqueta="Texto (opcional)" ayuda="Markdown y fórmulas, como en las notas. Breve: va en una banda.">
          <textarea rows={4} maxLength={5000} value={valores.texto} onChange={(e) => cambiar("texto", e.target.value)} />
        </Campo>
        {valores.texto.trim() && (
          <div className="avisos-admin__vista">
            <p className="avisos-admin__vista-etiqueta">Vista previa</p>
            <MarkdownView>{valores.texto}</MarkdownView>
          </div>
        )}
        <div className="dialogo__fila">
          <Campo id="aviso-desde" etiqueta="Desde (opcional)" ayuda="Vacío: desde ya.">
            <input type="datetime-local" value={valores.desde} onChange={(e) => cambiar("desde", e.target.value)} />
          </Campo>
          <Campo id="aviso-hasta" etiqueta="Hasta (opcional)" ayuda="Vacío: hasta que lo quites." error={errores.hasta}>
            <input type="datetime-local" value={valores.hasta} onChange={(e) => cambiar("hasta", e.target.value)} />
          </Campo>
        </div>
        <fieldset className="avisos-admin__lugares">
          <legend>Dónde se ve</legend>
          <div className="dialogo__fila">
            {Object.entries(LUGARES_AVISO).map(([lugar, texto]) => (
              <Casilla
                key={lugar}
                id={`aviso-lugar-${lugar}`}
                etiqueta={texto}
                descripcion={lugar === "publico" ? "Portada, catálogo, red y lectura." : "Para quienes escriben notas."}
                checked={valores.lugares.includes(lugar)}
                onChange={(v) => alternarLugar(lugar, v)}
              />
            ))}
          </div>
          {errores.lugares && <p className="campo__error">{errores.lugares}</p>}
        </fieldset>
        <div className="dialogo__fila">
          <Casilla
            id="aviso-fijado"
            etiqueta="Fijado"
            descripcion="Va primero en la banda, antes que los demás."
            checked={valores.fijado}
            onChange={(v) => cambiar("fijado", v)}
          />
          <Casilla
            id="aviso-cerrable"
            etiqueta="Se puede cerrar"
            descripcion="Quien lo cierra deja de verlo en su navegador."
            checked={valores.cerrable}
            onChange={(v) => cambiar("cerrable", v)}
          />
        </div>
        <p className="avisos-admin__nota">
          En los reconocimientos, nombra a las personas por su firma pública y solo con su permiso.
        </p>
        {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      </form>
    </Dialogo>
  );
}
