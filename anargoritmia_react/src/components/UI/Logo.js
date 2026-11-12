import React from "react";
import forma from "../../assets/images/logo-forma.png";
import punto from "../../assets/images/logo-punto.png";

/**
 * Logo original de Anargoritmia (assets/images/logoAnargoritmia.png),
 * separado en dos capas para que funcione en ambos modos:
 * - la forma usa el PNG como máscara y toma el color del texto (currentColor):
 *   blanca sobre fondos oscuros, oscura sobre fondos claros;
 * - el punto conserva su rojo original.
 * Decorativo por defecto; con `titulo` se anuncia como imagen.
 */
export function Logo({ tamano = 32, titulo, className = "" }) {
  const accesible = titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true };
  return (
    <span className={`logo ${className}`} style={{ width: tamano, height: tamano }} {...accesible}>
      <span className="logo__forma" style={{ WebkitMaskImage: `url(${forma})`, maskImage: `url(${forma})` }} />
      <img className="logo__punto" src={punto} alt="" />
    </span>
  );
}
