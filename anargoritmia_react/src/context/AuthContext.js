import React, { useState, useEffect, createContext, useCallback } from "react";
import { toast } from "react-toastify";
import { setToken, getToken, removeToken } from "../api/token";
import { getMeApi } from "../api/user";
import { EVENTO_SESION_EXPIRADA } from "../api/http";
import { Boton, Logo } from "../components/UI";
import "./AuthContext.css";

export const AuthContext = createContext({
  auth: undefined,
  login: () => null,
  logout: () => null,
});

/**
 * Sesión del usuario.
 * - Solo se cierra si el servidor rechaza el token (401) o si el usuario sale.
 * - Si el servidor no responde (apagado, reiniciándose, error 5xx), la sesión
 *   se conserva y se ofrece reintentar, en lugar de expulsar al usuario.
 */
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(undefined);
  const [sinServidor, setSinServidor] = useState(null); // mensaje si no se pudo verificar
  const [reintentando, setReintentando] = useState(false);

  const verificar = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAuth(null);
      return;
    }
    setReintentando(true);
    try {
      const me = await getMeApi(token);
      setSinServidor(null);
      setAuth({ token, me });
    } catch (error) {
      if (error.status === 401) {
        removeToken();
        setSinServidor(null);
        setAuth(null);
      } else {
        setSinServidor(error.message);
      }
    } finally {
      setReintentando(false);
    }
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  // Un 401 en cualquier petición con token = sesión expirada
  useEffect(() => {
    const alExpirar = () => {
      if (!getToken()) return;
      removeToken();
      setAuth(null);
      toast.info("Tu sesión expiró. Vuelve a iniciar sesión.", { toastId: "sesion-expirada" });
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, []);

  const login = async (token) => {
    setToken(token);
    try {
      const me = await getMeApi(token);
      setAuth({ token, me });
    } catch (error) {
      // Solo un token rechazado invalida la sesión; un fallo del servidor no
      if (error.status === 401) removeToken();
      throw error;
    }
  };

  const logout = () => {
    removeToken();
    setAuth(null);
  };

  if (sinServidor && auth === undefined) {
    return (
      <main className="sin-servidor">
        <Logo tamano={72} />
        <h1>No se pudo contactar con el servidor</h1>
        <p>{sinServidor}</p>
        <p className="sin-servidor__nota">Tu sesión sigue guardada en este navegador; no hace falta volver a entrar.</p>
        <div className="sin-servidor__acciones">
          <Boton variante="principal" cargando={reintentando} onClick={verificar}>
            Reintentar
          </Boton>
          <Boton
            onClick={() => {
              setSinServidor(null);
              setAuth(null); // solo por esta visita; el token se conserva
            }}
          >
            Continuar sin sesión
          </Boton>
        </div>
      </main>
    );
  }

  if (auth === undefined) return null;

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
}
