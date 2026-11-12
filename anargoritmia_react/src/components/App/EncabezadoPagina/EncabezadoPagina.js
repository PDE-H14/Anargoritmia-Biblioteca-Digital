import React from "react";
import "./EncabezadoPagina.css";

/**
 * Encabezado de página de la app: título, subtítulo y acción principal.
 * Claro: fondo blanco con filete negro de 6 px. Oscuro: degradado.
 */
export function EncabezadoPagina({ titulo, subtitulo, acciones }) {
  return (
    <header className="encabezado-pagina">
      <div className="encabezado-pagina__textos">
        <h1 className="encabezado-pagina__titulo">{titulo}</h1>
        {subtitulo && <p className="encabezado-pagina__subtitulo">{subtitulo}</p>}
      </div>
      {acciones && <div className="encabezado-pagina__acciones">{acciones}</div>}
    </header>
  );
}
