import React from "react";

/**
 * Tabla de datos dentro de una caja con desplazamiento horizontal propio:
 * en móvil se desplaza la tabla, nunca la página.
 * `descripcion` se lee con lectores de pantalla (caption oculto).
 */
export function Tabla({ descripcion, children, className = "" }) {
  return (
    <div className={`tabla ${className}`} role="region" aria-label={descripcion} tabIndex={0}>
      <table className="tabla__t">
        {descripcion && <caption className="solo-lectores">{descripcion}</caption>}
        {children}
      </table>
    </div>
  );
}
