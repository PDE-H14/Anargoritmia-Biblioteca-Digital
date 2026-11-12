import React, { useEffect, useId, useRef, useState } from "react";
import { Icono } from "./Icono";
import { Boton } from "./Boton";
import { Aviso } from "./Aviso";

/**
 * Diálogo modal sobre <dialog> nativo: el navegador atrapa el foco, lo
 * devuelve al cerrar y cierra con Esc. Clic fuera del panel también cierra,
 * salvo con cerrarFuera={false} (formularios).
 */
export function Dialogo({ abierto, titulo, onCerrar, children, acciones, amplio = false, cerrarFuera = true, className = "" }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={`dialogo ${amplio ? "dialogo--amplio" : ""} ${className}`}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault(); // el estado lo controla el padre
        onCerrar?.();
      }}
      onClick={(e) => {
        // Clic en el fondo; los formularios lo desactivan para no perder lo escrito
        if (cerrarFuera && e.target === ref.current) onCerrar?.();
      }}
    >
      {abierto && (
        <div className="dialogo__panel">
          <header className="dialogo__cabecera">
            <h2 id={idTitulo} className="dialogo__titulo">
              {titulo}
            </h2>
            <button type="button" className="dialogo__cerrar" aria-label="Cerrar" onClick={onCerrar}>
              <Icono nombre="cerrar" />
            </button>
          </header>
          <div className="dialogo__cuerpo">{children}</div>
          {acciones && <footer className="dialogo__acciones">{acciones}</footer>}
        </div>
      )}
    </dialog>
  );
}

/**
 * Confirmación de una acción (eliminar nota, categoría, usuario…).
 * Muestra el progreso y, si la acción falla, el error sin cerrarse.
 * Si `destructivo`, el botón de confirmar es rojo y dice qué se pierde.
 */
export function DialogoConfirmacion({
  abierto,
  titulo,
  children,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  destructivo = false,
  onConfirmar,
  onCerrar,
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (abierto) setError(null);
  }, [abierto]);

  const confirmar = async () => {
    setCargando(true);
    setError(null);
    try {
      await onConfirmar();
    } catch (e) {
      setError(e?.message || "No se pudo completar la acción.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialogo
      abierto={abierto}
      titulo={titulo}
      onCerrar={cargando ? undefined : onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={cargando}>
            {textoCancelar}
          </Boton>
          <Boton variante={destructivo ? "destructivo" : "principal"} cargando={cargando} onClick={confirmar}>
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      {children}
      {error && (
        <Aviso tipo="error" className="dialogo__error">
          {error}
        </Aviso>
      )}
    </Dialogo>
  );
}
