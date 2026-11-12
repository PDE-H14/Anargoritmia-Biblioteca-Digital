import React, { cloneElement, isValidElement } from "react";
import { Icono } from "./Icono";

/**
 * Campo de formulario con etiqueta visible (no solo placeholder).
 * El control va como hijo (<input>, <textarea>, <select>); Campo le añade
 * id, aria-invalid y aria-describedby para enlazar ayuda y error.
 *
 *   <Campo id="correo" etiqueta="Correo electrónico" error={errores.correo}>
 *     <input type="email" value={...} onChange={...} />
 *   </Campo>
 */
export function Campo({ id, etiqueta, ayuda, error, children, className = "", mono = false }) {
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = error ? `${id}-error` : null;
  const describe = [idError, idAyuda].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describe,
        className: `campo__control ${mono ? "campo__control--mono" : ""} ${children.props.className || ""}`,
      })
    : children;

  return (
    <div className={`campo ${error ? "campo--error" : ""} ${className}`}>
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {control}
      {error && (
        <p className="campo__error" id={idError}>
          <Icono nombre="error" tamano={16} />
          {error}
        </p>
      )}
      {ayuda && (
        <p className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </p>
      )}
    </div>
  );
}
