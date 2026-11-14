import { apiFetch } from "./http";

// Avisos vigentes para el sitio público o el taller; el primero va en la banda
export function getAvisosApi(lugar) {
  return apiFetch(`/api/avisos/${lugar ? `?lugar=${lugar}` : ""}`);
}

// Lo ya publicado, para la página «Novedades»
export function getHistorialAvisosApi() {
  return apiFetch("/api/avisos/historial/");
}

// Administración
export function getTodosAvisosApi(token) {
  return apiFetch("/api/avisos/todos/", { token });
}

export function crearAvisoApi(datos, token) {
  return apiFetch("/api/avisos/", { method: "POST", token, json: datos });
}

export function editarAvisoApi(id, datos, token) {
  return apiFetch(`/api/avisos/${id}/`, { method: "PATCH", token, json: datos });
}

export function borrarAvisoApi(id, token) {
  return apiFetch(`/api/avisos/${id}/`, { method: "DELETE", token });
}
