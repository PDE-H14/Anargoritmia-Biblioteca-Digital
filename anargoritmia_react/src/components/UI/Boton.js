import React, { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Icono } from "./Icono";

/**
 * Botón de la app.
 * variante:
 *   - principal: la acción principal de la pantalla (relleno --pri-bg).
 *   - secundario: contorno.
 *   - destructivo: eliminar de forma permanente (relleno rojo).
 *   - enlace / enlace-peligro: acciones en línea (tablas), subrayadas.
 * Con `to` se renderiza como <Link>; con `href`, como <a>; si no, <button>.
 * `cargando` deshabilita el botón y lo anuncia con aria-busy.
 */
export const Boton = forwardRef(function Boton(
  { variante = "secundario", icono, cargando = false, bloque = false, to, href, className = "", children, disabled, type, ...resto },
  ref,
) {
  const clases = [
    "boton",
    `boton--${variante}`,
    bloque && "boton--bloque",
    cargando && "boton--cargando",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const contenido = (
    <>
      {cargando ? <span className="boton__giro" aria-hidden="true" /> : icono && <Icono nombre={icono} tamano={18} />}
      {children && <span>{children}</span>}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={clases} {...resto}>
        {contenido}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={clases} {...resto}>
        {contenido}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type || "button"}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {contenido}
    </button>
  );
});
