import React, { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks";
import { Logo, Icono } from "../../UI";
import { BotonTema } from "../../Common";
import { LOGIN_PATH, RUTAS } from "../../../utils/constants";
import "./MenuLateral.css";

// Las entradas del taller, en el orden del diseño F. «Catálogo» sale a la portada pública.
const ENTRADAS = [
  { a: "/#catalogo", texto: "Catálogo", icono: "catalogo", activa: () => false },
  { a: RUTAS.LAB, texto: "Recientes", icono: "recientes", activa: (p) => p === RUTAS.LAB },
  { a: RUTAS.MIS_NOTAS, texto: "Mis notas", icono: "notas", activa: (p) => p === RUTAS.MIS_NOTAS },
  { a: RUTAS.CATEGORIAS, texto: "Categorías", icono: "carpeta", soloStaff: true, activa: (p) => p === RUTAS.CATEGORIAS },
  // Creación queda activa también al editar una nota existente (/lab/notas/:id)
  { a: RUTAS.CREAR, texto: "Creación", icono: "lapiz", activa: (p) => p.startsWith("/lab/notas/") },
  { a: RUTAS.USUARIOS, texto: "Usuarios", icono: "usuarios", soloStaff: true, activa: (p) => p === RUTAS.USUARIOS },
  { a: RUTAS.CORRECCIONES, texto: "Correcciones", icono: "advertencia", soloStaff: true, activa: (p) => p === RUTAS.CORRECCIONES },
  { a: RUTAS.MIS_DATOS, texto: "Mis datos", icono: "ficha", activa: (p) => p === RUTAS.MIS_DATOS },
];

function nombreVisible(me) {
  if (!me) return "";
  const completo = [me.first_name, me.last_name].filter(Boolean).join(" ");
  return completo || me.username || me.email;
}

/**
 * Menú lateral de la aplicación (232 px).
 * Pie: usuario, conmutador de modo y cerrar sesión.
 * `contraido`: solo iconos (el texto queda para lectores de pantalla).
 */
export function MenuLateral({ contraido, onAlternar }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const me = auth?.me;
  const navRef = useRef(null);

  // En móvil la navegación se desplaza en horizontal: mantiene visible la sección activa
  useEffect(() => {
    navRef.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  const salir = () => {
    logout();
    navigate(LOGIN_PATH, { replace: true });
  };

  return (
    <aside className={`menu-lateral ${contraido ? "menu-lateral--contraido" : ""}`}>
      <div className="menu-lateral__marca">
        <Link to={RUTAS.LAB} className="menu-lateral__logo" aria-label="Anargoritmia, ir a Recientes">
          <Logo tamano={34} />
          <span className="menu-lateral__nombre">Anargoritmia</span>
        </Link>
        <button
          type="button"
          className="menu-lateral__icono-boton menu-lateral__alternar"
          aria-label={contraido ? "Expandir menú" : "Contraer menú"}
          aria-expanded={!contraido}
          title={contraido ? "Expandir menú" : "Contraer menú"}
          onClick={onAlternar}
        >
          <Icono nombre="panel" />
        </button>
      </div>

      <nav className="menu-lateral__nav" aria-label="Secciones" ref={navRef}>
        <ul>
          {ENTRADAS.filter((e) => !e.soloStaff || me?.is_staff).map((e) => {
            const activa = e.activa(pathname);
            return (
              <li key={e.a}>
                <Link
                  to={e.a}
                  className={`menu-lateral__enlace ${activa ? "es-activa" : ""}`}
                  aria-current={activa ? "page" : undefined}
                  title={contraido ? e.texto : undefined}
                >
                  <Icono nombre={e.icono} tamano={22} />
                  <span className="menu-lateral__texto">{e.texto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="menu-lateral__pie">
        <div className="menu-lateral__usuario">
          <strong title={nombreVisible(me)}>{nombreVisible(me)}</strong>
          <span>
            @{me?.username}
            {me?.is_staff && " · staff"}
          </span>
        </div>
        <div className="menu-lateral__controles">
          <BotonTema className="menu-lateral__icono-boton" />
          <button
            type="button"
            className="menu-lateral__icono-boton"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={salir}
          >
            <Icono nombre="salir" />
          </button>
        </div>
      </div>
    </aside>
  );
}
