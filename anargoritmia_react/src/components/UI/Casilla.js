import React from "react";

/**
 * Casilla de verificación con etiqueta real y área táctil de 44 px.
 * `descripcion` explica la consecuencia (p. ej. qué permite ser staff).
 */
export function Casilla({ id, etiqueta, descripcion, checked, onChange, disabled }) {
  return (
    <div className={`casilla ${disabled ? "casilla--deshabilitada" : ""}`}>
      <input
        id={id}
        type="checkbox"
        className="casilla__control"
        checked={checked}
        disabled={disabled}
        aria-describedby={descripcion ? `${id}-desc` : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="casilla__etiqueta">
        <span>{etiqueta}</span>
        {descripcion && (
          <span className="casilla__descripcion" id={`${id}-desc`}>
            {descripcion}
          </span>
        )}
      </label>
    </div>
  );
}
