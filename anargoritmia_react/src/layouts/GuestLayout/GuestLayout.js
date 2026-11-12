import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks";

import { LOGIN_PATH, RUTAS } from "../../utils/constants";

export { LOGIN_PATH };

/**
 * Layout para páginas de invitado (login).
 * Si ya hay sesión, regresa a la página que se intentaba abrir
 * antes de ser redirigido al login, o al laboratorio (/lab) si no había ninguna.
 */
export function GuestLayout(props) {
  const { children } = props;
  const { auth } = useAuth();
  const location = useLocation();

  if (auth) {
    const destino = location.state?.from;
    const ruta =
      destino && destino.pathname !== LOGIN_PATH
        ? `${destino.pathname}${destino.search || ""}${destino.hash || ""}`
        : RUTAS.LAB;
    return <Navigate to={ruta} replace />;
  }

  return children;
}
