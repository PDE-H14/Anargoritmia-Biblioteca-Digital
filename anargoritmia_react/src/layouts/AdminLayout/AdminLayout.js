import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import "./AdminLayout.css";
import { MenuLateral } from "../../components/App";
import { BandaAvisos } from "../../components/Common";
import { useAuth } from "../../hooks";
import { LOGIN_PATH, RUTAS } from "../../utils/constants";

const CLAVE_MENU = "anargoritmia-menu";

function menuContraidoGuardado() {
  try {
    return localStorage.getItem(CLAVE_MENU) === "contraido";
  } catch {
    return false;
  }
}

/**
 * Armazón de la aplicación (diseño F): menú lateral de 232 px y, a la
 * derecha, el contenido de la página (que trae su propio encabezado).
 */
export function AdminLayout({ children, staffOnly }) {
  const { auth } = useAuth();
  const location = useLocation();
  const [contraido, setContraido] = useState(menuContraidoGuardado);

  const alternarMenu = () => {
    setContraido((actual) => {
      try {
        localStorage.setItem(CLAVE_MENU, actual ? "expandido" : "contraido");
      } catch {
        // sin almacenamiento: dura solo esta visita
      }
      return !actual;
    });
  };

  // Sin sesión: la URL pasa a /login y se recuerda la página pedida
  if (!auth) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  // Páginas exclusivas de administradores
  if (staffOnly && !auth.me?.is_staff) {
    return <Navigate to={RUTAS.LAB} replace />;
  }

  return (
    <div className="app-layout">
      <MenuLateral contraido={contraido} onAlternar={alternarMenu} />
      <main className="app-layout__contenido" id="contenido">
        <BandaAvisos lugar="taller" />
        {children}
      </main>
    </div>
  );
}
