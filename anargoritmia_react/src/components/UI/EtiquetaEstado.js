import React from "react";

/**
 * Estado de una nota. No depende solo del color:
 * «Publicada» es relleno sólido; «Borrador», contorno punteado.
 */
export function EtiquetaEstado({ borrador }) {
  return (
    <span className={`etiqueta-estado ${borrador ? "etiqueta-estado--borrador" : "etiqueta-estado--publicada"}`}>
      {borrador ? "Borrador" : "Publicada"}
    </span>
  );
}
