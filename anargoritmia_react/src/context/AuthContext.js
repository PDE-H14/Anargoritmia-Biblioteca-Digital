import React, { useState, useEffect, createContext } from "react";
import { setToken, getToken, removeToken } from "../api/token";
import { getMeApi } from "../api/user";

export const AuthContext = createContext({
  auth: undefined,
  login: () => null,
  logout: () => null,
});

export function AuthProvider(props) {
  const { children } = props;
  const [auth, setAuth] = useState(undefined);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (token) {
        try {
          const me = await getMeApi(token);
          setAuth({ token, me });
        } catch (error) {
          removeToken();
          setAuth(null);
        }
      } else {
        setAuth(null);
      }
    })();
  }, []);

  const login = async (token) => {
    setToken(token);
    const me = await getMeApi(token);
    setAuth({ token, me });
  };

  const logout = () => {
    if (auth) {
      removeToken();
      setAuth(null);
    }
  };

  const valueContext = {
    auth,
    login,
    logout,
  };

  if (auth === undefined) return null;

  return (
    <AuthContext.Provider value={valueContext}>{children}</AuthContext.Provider>
  );
}
