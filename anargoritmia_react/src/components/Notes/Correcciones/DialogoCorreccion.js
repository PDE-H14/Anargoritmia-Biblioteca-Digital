import React, { useEffect, useState } from "react";
import { createCorreccionApi } from "../../../api/note";
import { Aviso, Boton, Campo, Dialogo } from "../../UI";
import { AYUDA_ERROR, ERRORES_POR_CELDA, MIN_DESCRIPCION, TIPOS_ERROR } from "../../../utils/notas";
import { etiquetaCelda } from "./etiquetas";
import "./Correcciones.css";

/**
 * Propuesta de corrección sobre una celda pública. Para que llegue algo útil
 * al autor (y no un comentario suelto) se elige la celda, un tipo de error
 * que tenga sentido para esa clase de celda y se explica con al menos
 * MIN_DESCRIPCION caracteres. El servidor repite todas estas validaciones.
 */
export function DialogoCorreccion({ abierto, nota, idBloqueInicial, token, onCerrar, onEnviada }) {
  const celdas = nota?.bloques || [];
  const [idBloque, setIdBloque] = useState("");
  const [tipoError, setTipoError] = useState("");
  const [fragmento, setFragmento] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setIdBloque(idBloqueInicial || celdas[0]?.id || "");
    setTipoError("");
    setFragmento("");
    setDescripcion("");
    setErrores({});
  }, [abierto, idBloqueInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  const indice = celdas.findIndex((b) => b.id === idBloque);
  const celda = celdas[indice];
  const permitidos = ERRORES_POR_CELDA[celda?.tipo] || [];
  const faltan = Math.max(0, MIN_DESCRIPCION - descripcion.trim().length);

  const cambiarCelda = (id) => {
    setIdBloque(id);
    const nueva = celdas.find((b) => b.id === id);
    if (!(ERRORES_POR_CELDA[nueva?.tipo] || []).includes(tipoError)) setTipoError("");
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!celda) encontrados.id_bloque = "Elige la celda donde está el error.";
    if (!tipoError) encontrados.tipo_error = "Elige qué tipo de error es.";
    if (faltan > 0) encontrados.descripcion = `Explica el error con al menos ${MIN_DESCRIPCION} caracteres.`;
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const creada = await createCorreccionApi(
        nota.id_documento,
        { id_bloque: idBloque, tipo_error: tipoError, fragmento, descripcion },
        token
      );
      onEnviada?.(creada);
    } catch (error) {
      const datos = error.data || {};
      const deCampo = {};
      ["id_bloque", "tipo_error", "descripcion", "fragmento"].forEach((campo) => {
        if (datos[campo]) deCampo[campo] = [].concat(datos[campo]).join(" ");
      });
      setErrores(Object.keys(deCampo).length ? deCampo : { general: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo
      abierto={abierto}
      titulo="Proponer una corrección"
      onCerrar={enviando ? undefined : onCerrar}
      cerrarFuera={false}
      amplio
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton variante="principal" type="submit" form="form-correccion" cargando={enviando}>
            Enviar al autor
          </Boton>
        </>
      }
    >
      <form id="form-correccion" className="form-correccion" onSubmit={enviar} noValidate>
        <p className="form-correccion__intro">
          La corrección llega solo al autor de la nota, que decide si la atiende. Sé concreto: qué está mal y, si
          puedes, cómo corregirlo.
        </p>

        <Campo id="correccion-celda" etiqueta="Celda" error={errores.id_bloque}>
          <select value={idBloque} onChange={(e) => cambiarCelda(e.target.value)}>
            {celdas.map((b, i) => (
              <option key={b.id} value={b.id}>
                {etiquetaCelda(b, i)}
              </option>
            ))}
          </select>
        </Campo>

        <fieldset
          className={`form-correccion__tipos ${errores.tipo_error ? "campo--error" : ""}`}
          aria-describedby={errores.tipo_error ? "correccion-tipo-error" : undefined}
        >
          <legend className="campo__etiqueta">Tipo de error</legend>
          {permitidos.map((tipo) => (
            <label key={tipo} className="opcion-error">
              <input
                type="radio"
                name="tipo_error"
                value={tipo}
                checked={tipoError === tipo}
                onChange={() => setTipoError(tipo)}
              />
              <span>
                <strong>{TIPOS_ERROR[tipo]}</strong>
                <span className="opcion-error__ayuda">{AYUDA_ERROR[tipo]}</span>
              </span>
            </label>
          ))}
          {errores.tipo_error && (
            <p className="campo__error" id="correccion-tipo-error">
              {errores.tipo_error}
            </p>
          )}
        </fieldset>

        <Campo
          id="correccion-fragmento"
          etiqueta="Pasaje exacto (opcional)"
          ayuda="Copia la línea o la fórmula donde está el error para que el autor la encuentre."
          error={errores.fragmento}
          mono
        >
          <input value={fragmento} maxLength={300} onChange={(e) => setFragmento(e.target.value)} />
        </Campo>

        <Campo
          id="correccion-descripcion"
          etiqueta="Qué está mal"
          error={errores.descripcion}
          ayuda={faltan > 0 ? `Faltan ${faltan} caracteres.` : `${descripcion.length} de 2000 caracteres.`}
        >
          <textarea
            rows={5}
            maxLength={2000}
            placeholder="Por ejemplo: en el paso 3 la derivada de x² es 2x, no x; con eso el resultado final cambia a…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>

        {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      </form>
    </Dialogo>
  );
}
