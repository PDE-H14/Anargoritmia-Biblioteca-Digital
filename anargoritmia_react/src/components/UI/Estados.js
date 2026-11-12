import React from "react";
import { Icono } from "./Icono";

/**
 * Estado vacío: una frase y la acción que lo resuelve.
 *   <EstadoVacio icono="notas" titulo="Todavía no tienes notas." accion={<Boton …/>} />
 */
export function EstadoVacio({ icono, titulo, children, accion }) {
  return (
    <div className="estado-vacio">
      {icono && <Icono nombre={icono} tamano={36} className="estado-vacio__icono" />}
      <p className="estado-vacio__titulo">{titulo}</p>
      {children && <p className="estado-vacio__texto">{children}</p>}
      {accion && <div className="estado-vacio__accion">{accion}</div>}
    </div>
  );
}

/** Indicador de carga accesible (role="status"). */
export function Cargando({ texto = "Cargando…", enLinea = false }) {
  return (
    <div className={`cargando ${enLinea ? "cargando--en-linea" : ""}`} role="status">
      <span className="cargando__giro" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
