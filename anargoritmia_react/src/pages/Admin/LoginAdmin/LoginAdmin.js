import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../../hooks";
import { loginApi } from "../../../api/user";
import { BotonTema } from "../../../components/Common";
import { Aviso, Boton, Campo, Logo } from "../../../components/UI";
import { REGISTRO_PATH } from "../../../utils/constants";
import "./LoginAdmin.css";

/** Pantalla de acceso compartida por Iniciar sesión y Crear cuenta: marca a la izquierda, formulario a la derecha. */
export function PantallaAcceso({ children }) {
  return (
    <div className="acceso">
      <section className="acceso__marca" aria-label="Anargoritmia">
        <Link to="/" className="acceso__logo" aria-label="Ir a la portada">
          <Logo tamano={100} />
        </Link>
        <div className="acceso__cartel">
          <p className="acceso__nombre" aria-hidden="true">
            <span>Anar</span>
            <span>goritmia</span>
          </p>
          <p className="acceso__descripcion">
            Biblioteca Algorítmica Digital. Apuntes, algoritmos y simulaciones de la comunidad de la LMA, en español y bajo
            CC BY-SA 4.0.
          </p>
        </div>
        <p className="acceso__lema">Sin rastreadores · Sin cookies de terceros</p>
      </section>

      <section className="acceso__panel">
        <BotonTema className="acceso__tema" />
        {children}
      </section>
    </div>
  );
}

/**
 * Acceso (diseño F): marca a la izquierda, formulario a la derecha.
 * Tras iniciar sesión, GuestLayout redirige a la página pedida o a /lab.
 */
export function LoginAdmin() {
  const { login } = useAuth();
  const location = useLocation();
  const [valores, setValores] = useState({ email: "", password: "" });
  const [errores, setErrores] = useState({});
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const avisoRef = useRef(null);

  useEffect(() => {
    document.title = "Iniciar sesión · Anargoritmia";
    return () => {
      document.title = "Anargoritmia";
    };
  }, []);

  // Un error general recibe el foco para que se lea de inmediato
  useEffect(() => {
    if (errores.general) avisoRef.current?.focus();
  }, [errores.general]);

  const cambiar = (campo) => (e) => {
    setValores({ ...valores, [campo]: e.target.value });
    if (errores[campo] || errores.general) setErrores({});
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!valores.email.trim()) encontrados.email = "Escribe tu correo electrónico.";
    else if (!/^\S+@\S+\.\S+$/.test(valores.email.trim())) encontrados.email = "Ese correo no parece válido.";
    if (!valores.password) encontrados.password = "Escribe tu contraseña.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const { access, refresh } = await loginApi({ email: valores.email.trim(), password: valores.password });
      await login(access, refresh);
    } catch (error) {
      setErrores({ general: error.message || "No se pudo iniciar sesión." });
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
        <form className="acceso__formulario" onSubmit={enviar} noValidate>
          <h1 className="acceso__titulo">Iniciar sesión</h1>

          {errores.general && (
            <div ref={avisoRef} tabIndex={-1} className="acceso__error">
              <Aviso tipo="error">{errores.general}</Aviso>
            </div>
          )}

          <Campo id="acceso-correo" etiqueta="Correo electrónico" error={errores.email}>
            <input
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              value={valores.email}
              onChange={cambiar("email")}
            />
          </Campo>

          <div className="acceso__contrasena">
            <Campo id="acceso-contrasena" etiqueta="Contraseña" error={errores.password}>
              <input
                type={mostrar ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={valores.password}
                onChange={cambiar("password")}
              />
            </Campo>
            <button
              type="button"
              className="acceso__mostrar"
              aria-pressed={mostrar}
              aria-controls="acceso-contrasena"
              onClick={() => setMostrar((m) => !m)}
            >
              {mostrar ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <Boton type="submit" variante="principal" bloque cargando={enviando}>
            Entrar
          </Boton>

          <p className="acceso__nota">
            ¿No tienes cuenta?{" "}
            <Link to={REGISTRO_PATH} state={location.state}>
              Crea una
            </Link>
            . Para leer no hace falta. <Link to="/">Ir al catálogo</Link>
          </p>
        </form>
    </PantallaAcceso>
  );
}
