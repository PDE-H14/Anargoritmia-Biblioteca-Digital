import React from "react";
import { Icono } from "./Icono";

const TIPOS = {
  info: { icono: "info", rol: "status" },
  exito: { icono: "exito", rol: "status" },
  advertencia: { icono: "advertencia", rol: "status" },
  error: { icono: "error", rol: "alert" },
};

/**
 * Aviso en línea (errores de formulario, confirmaciones, advertencias).
 * El tipo se comunica con icono y franja lateral, no solo con color.
 * Los errores usan role="alert" para anunciarse al aparecer.
 */
export function Aviso({ tipo = "info", titulo, children, onCerrar, className = "" }) {
  const { icono, rol } = TIPOS[tipo] || TIPOS.info;
  return (
    <div className={`aviso aviso--${tipo} ${className}`} role={rol}>
      <Icono nombre={icono} tamano={20} className="aviso__icono" />
      <div className="aviso__cuerpo">
        {titulo && <p className="aviso__titulo">{titulo}</p>}
        {children && <div className="aviso__texto">{children}</div>}
      </div>
      {onCerrar && (
        <button type="button" className="aviso__cerrar" aria-label="Cerrar aviso" onClick={onCerrar}>
          <Icono nombre="cerrar" tamano={18} />
        </button>
      )}
    </div>
  );
}
