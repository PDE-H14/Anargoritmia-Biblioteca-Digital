import { TOKEN, TOKEN_RENOVACION } from "../utils/constants";

// Token de acceso (15 min): va en cada petición
export function setToken(token) {
  localStorage.setItem(TOKEN, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN);
}

// Token de renovación (7 días, rota en cada uso): solo sirve para pedir otro de acceso
export function setRefresh(token) {
  localStorage.setItem(TOKEN_RENOVACION, token);
}

export function getRefresh() {
  return localStorage.getItem(TOKEN_RENOVACION);
}

export function removeToken() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(TOKEN_RENOVACION);
}
