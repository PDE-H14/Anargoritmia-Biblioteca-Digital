import React from "react";

/**
 * Tarjeta de contenido (perfil, contraseña, datos de la nota…).
 * variante="peligro": borde punteado y fondo de zona de eliminación.
 */
export function Tarjeta({ titulo, acciones, variante, as: Etiqueta = "section", children, className = "" }) {
  return (
    <Etiqueta className={`tarjeta ${variante ? `tarjeta--${variante}` : ""} ${className}`}>
      {(titulo || acciones) && (
        <header className="tarjeta__cabecera">
          {titulo && <h2 className="tarjeta__titulo">{titulo}</h2>}
          {acciones && <div className="tarjeta__acciones">{acciones}</div>}
        </header>
      )}
      {children}
    </Etiqueta>
  );
}
