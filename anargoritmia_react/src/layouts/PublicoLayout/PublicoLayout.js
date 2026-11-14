import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks";
import { Logo } from "../../components/UI";
import { BandaAvisos, BotonTema } from "../../components/Common";
import { LOGIN_PATH, RUTAS, RUTA_MAPA, RUTA_NOVEDADES } from "../../utils/constants";
import "./PublicoLayout.css";

/**
 * Armazón público (Portada, Lectura, 404): cabecera de 64 px con logo y
 * tres enlaces, sin menú lateral, y pie con la licencia.
 * Accesible con o sin sesión.
 */
export function PublicoLayout({ children }) {
  const { auth } = useAuth();
  const { pathname } = useLocation();

  const enlaces = [
    // Las notas públicas pertenecen al catálogo
    { a: "/#catalogo", texto: "Catálogo", activo: pathname === "/" || pathname.startsWith("/notas/") },
    {
      a: RUTA_MAPA,
      // En pantallas angostas solo «Red», para que el menú quepa
      texto: (
        <>
          Red<span className="publico__largo">&nbsp;de conocimiento</span>
        </>
      ),
      clave: "red",
      activo: pathname === RUTA_MAPA,
    },
    { a: auth ? RUTAS.LAB : `${LOGIN_PATH}`, texto: "Taller", activo: false },
  ];
  if (!auth) enlaces.push({ a: LOGIN_PATH, texto: "Entrar", activo: false });

  return (
    <div className="publico">
      <a href="#contenido-publico" className="publico__saltar">
        Saltar al contenido
      </a>
      <header className="publico__cabecera">
        <Link to="/" className="publico__marca" aria-label="Anargoritmia, portada">
          <Logo tamano={36} />
          <span className="publico__nombre">Anargoritmia</span>
        </Link>
        <nav className="publico__nav" aria-label="Principal">
          {enlaces.map((e) => (
            <Link
              key={e.clave || e.texto}
              to={e.a}
              className={`publico__enlace ${e.activo ? "es-activo" : ""}`}
              aria-current={e.activo ? "page" : undefined}
            >
              {e.texto}
            </Link>
          ))}
          <BotonTema className="publico__tema" />
        </nav>
      </header>

      <BandaAvisos lugar="publico" />

      <main id="contenido-publico" className="publico__contenido">
        {children}
      </main>

      <footer className="publico__pie">
        <p>
          Contenido bajo CC BY-SA 4.0; código bajo licencias abiertas. Este sitio no usa rastreadores ni cookies de
          terceros.
        </p>
        <div className="publico__pie-enlaces">
          <Link to={RUTA_NOVEDADES}>Novedades</Link>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer license">
            Leer la licencia<span className="solo-lectores"> (se abre en otra pestaña)</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
