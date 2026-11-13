import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../../hooks";
import { registroApi } from "../../../api/user";
import { Aviso, Boton, Campo } from "../../../components/UI";
import { LOGIN_PATH } from "../../../utils/constants";
import { PantallaAcceso } from "./LoginAdmin";
import "./LoginAdmin.css";

const PATRON_ALIAS = /^[\w.@+-]+$/;
const CAMPOS = ["username", "email", "first_name", "last_name", "password"];

/**
 * Crear cuenta: alta abierta para escribir notas y proponer correcciones.
 * La cuenta nace sin privilegios de administrador (lo garantiza la API).
 * Al crearla, la sesión queda iniciada y GuestLayout lleva a /lab o a la
 * página que se intentaba abrir.
 */
export function Registro() {
  const { login } = useAuth();
  const location = useLocation();
  const [valores, setValores] = useState({ username: "", email: "", first_name: "", last_name: "", password: "" });
  const [errores, setErrores] = useState({});
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const avisoRef = useRef(null);

  useEffect(() => {
    document.title = "Crear cuenta · Anargoritmia";
    return () => {
      document.title = "Anargoritmia";
    };
  }, []);

  useEffect(() => {
    if (errores.general) avisoRef.current?.focus();
  }, [errores.general]);

  const cambiar = (campo) => (e) => {
    setValores({ ...valores, [campo]: e.target.value });
    if (errores[campo] || errores.general) setErrores((er) => ({ ...er, [campo]: undefined, general: undefined }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    const alias = valores.username.trim();
    if (!alias) encontrados.username = "Elige un alias.";
    else if (!PATRON_ALIAS.test(alias)) encontrados.username = "Sin espacios; solo letras, números y _ @ + - .";
    if (!/^\S+@\S+\.\S+$/.test(valores.email.trim())) encontrados.email = "Escribe un correo válido.";
    if (valores.password.length < 8) encontrados.password = "Usa al menos 8 caracteres.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const respuesta = await registroApi({
        ...valores,
        username: alias,
        email: valores.email.trim(),
        first_name: valores.first_name.trim(),
        last_name: valores.last_name.trim(),
      });
      await login(respuesta.tokens.access, respuesta.tokens.refresh);
    } catch (error) {
      // Errores por campo de la API (alias o correo en uso, contraseña débil)
      const datos = error.data || {};
      const deCampo = {};
      CAMPOS.forEach((campo) => {
        if (datos[campo]) deCampo[campo] = [].concat(datos[campo]).join(" ");
      });
      setErrores(Object.keys(deCampo).length ? deCampo : { general: error.message || "No se pudo crear la cuenta." });
      setEnviando(false);
    }
  };

  return (
    <PantallaAcceso>
      <form className="acceso__formulario" onSubmit={enviar} noValidate>
        <h1 className="acceso__titulo">Crear cuenta</h1>
        <p className="acceso__intro">
          Con una cuenta escribes notas en el taller y propones correcciones. Lo que publiques queda bajo CC BY-SA 4.0.
        </p>

        {errores.general && (
          <div ref={avisoRef} tabIndex={-1} className="acceso__error">
            <Aviso tipo="error">{errores.general}</Aviso>
          </div>
        )}

        <Campo
          id="registro-alias"
          etiqueta="Alias"
          error={errores.username}
          ayuda="Así te verán por omisión. Luego puedes firmar con tu nombre completo."
        >
          <input name="username" autoComplete="username" autoFocus value={valores.username} onChange={cambiar("username")} />
        </Campo>

        <Campo id="registro-correo" etiqueta="Correo electrónico" error={errores.email} ayuda="No se muestra a nadie.">
          <input type="email" name="email" autoComplete="email" inputMode="email" value={valores.email} onChange={cambiar("email")} />
        </Campo>

        <div className="acceso__fila">
          <Campo id="registro-nombre" etiqueta="Nombre (opcional)" error={errores.first_name}>
            <input name="first_name" autoComplete="given-name" value={valores.first_name} onChange={cambiar("first_name")} />
          </Campo>
          <Campo id="registro-apellidos" etiqueta="Apellidos (opcional)" error={errores.last_name}>
            <input name="last_name" autoComplete="family-name" value={valores.last_name} onChange={cambiar("last_name")} />
          </Campo>
        </div>

        <div className="acceso__contrasena">
          <Campo id="registro-contrasena" etiqueta="Contraseña" error={errores.password} ayuda="Al menos 8 caracteres; evita las muy comunes.">
            <input
              type={mostrar ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              value={valores.password}
              onChange={cambiar("password")}
            />
          </Campo>
          <button
            type="button"
            className="acceso__mostrar"
            aria-pressed={mostrar}
            aria-controls="registro-contrasena"
            onClick={() => setMostrar((m) => !m)}
          >
            {mostrar ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        <Boton type="submit" variante="principal" bloque cargando={enviando}>
          Crear cuenta
        </Boton>

        <p className="acceso__nota">
          ¿Ya tienes cuenta?{" "}
          <Link to={LOGIN_PATH} state={location.state}>
            Inicia sesión
          </Link>
        </p>
      </form>
    </PantallaAcceso>
  );
}
