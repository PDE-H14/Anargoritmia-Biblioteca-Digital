import React, { useState, useEffect, createContext, useCallback } from "react";
import { toast } from "react-toastify";
import { setToken, getToken, setRefresh, getRefresh, removeToken } from "../api/token";
import { getMeApi, logoutApi } from "../api/user";
import { EVENTO_SESION_EXPIRADA, EVENTO_TOKEN_RENOVADO } from "../api/http";
import { TOKEN } from "../utils/constants";
import { Boton, Logo } from "../components/UI";
import "./AuthContext.css";

export const AuthContext = createContext({
  auth: undefined,
  login: () => null,
  logout: () => null,
});

/**
 * Sesión del usuario.
 * - Token de acceso de 15 min que se renueva solo (ver api/http.js); la
 *   sesión se cierra si la renovación se rechaza o si el usuario sale.
 * - Si el servidor no responde (apagado, reiniciándose, error 5xx), la sesión
 *   se conserva y se ofrece reintentar, en lugar de expulsar al usuario.
 */
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(undefined);
  const [sinServidor, setSinServidor] = useState(null); // mensaje si no se pudo verificar
  const [reintentando, setReintentando] = useState(false);

  const verificar = useCallback(async () => {
    const token = getToken();
    if (!token || !getRefresh()) {
      // Sin token de renovación es una sesión anterior al cambio (tokens de
      // 120 días), que el servidor ya no acepta: se pide entrar de nuevo
      removeToken();
      setAuth(null);
      return;
    }
    setReintentando(true);
    try {
      const me = await getMeApi(token);
      setSinServidor(null);
      setAuth({ token: getToken(), me });
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

  // Token renovado (aquí o en otra pestaña): se actualiza sin recargar nada
  useEffect(() => {
    const alRenovar = (e) => setAuth((a) => (a ? { ...a, token: e.detail } : a));
    const enOtraPestana = (e) => {
      if (e.key !== TOKEN) return;
      if (e.newValue) setAuth((a) => (a ? { ...a, token: e.newValue } : a));
      else setAuth(null); // salió en otra pestaña
    };
    window.addEventListener(EVENTO_TOKEN_RENOVADO, alRenovar);
    window.addEventListener("storage", enOtraPestana);
    return () => {
      window.removeEventListener(EVENTO_TOKEN_RENOVADO, alRenovar);
      window.removeEventListener("storage", enOtraPestana);
    };
  }, []);

  /** Inicia la sesión con los tokens del login; sin argumentos, solo recarga el perfil. */
  const login = async (token = getToken(), refresh) => {
    setToken(token);
    if (refresh) setRefresh(refresh);
    try {
      const me = await getMeApi(token);
      setAuth({ token: getToken(), me });
    } catch (error) {
      // Solo un token rechazado invalida la sesión; un fallo del servidor no
      if (error.status === 401) removeToken();
      throw error;
    }
  };

  const logout = () => {
    const refresh = getRefresh();
    removeToken();
    setAuth(null);
    if (refresh) logoutApi(refresh).catch(() => {}); // si falla, caduca solo en 7 días
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
