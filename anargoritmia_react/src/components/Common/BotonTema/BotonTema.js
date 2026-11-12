import React from "react";
import { useTema } from "../../../utils/tema";
import "./BotonTema.css";

/**
 * Conmutador de modo claro/oscuro: solo icono.
 * Es un botón de alternancia (aria-pressed = modo oscuro activo) con
 * etiqueta fija para lectores de pantalla. En claro muestra una luna,
 * en oscuro un sol: el icono anuncia el modo al que se cambiará.
 */
export function BotonTema({ className = "" }) {
  const { tema, alternar } = useTema();
  const oscuro = tema === "oscuro";

  return (
    <button
      type="button"
      className={`boton-tema ${className}`}
      aria-label="Modo oscuro"
      aria-pressed={oscuro}
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={alternar}
    >
      {oscuro ? <IconoSol /> : <IconoLuna />}
    </button>
  );
}

function IconoLuna() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoSol() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </g>
    </svg>
  );
}
