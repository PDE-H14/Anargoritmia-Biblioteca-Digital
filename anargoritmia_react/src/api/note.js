import { apiFetch } from "./http";

// Notas publicadas en versión ligera (sin el contenido de las celdas), más recientes primero
export function getPublicNotesApi({ limite } = {}) {
  return apiFetch(`/api/notas/${limite ? `?limite=${limite}` : ""}`);
}

export function getMyNotesApi(token) {
  return apiFetch("/api/notas/mias/", { token });
}

// Con token y siendo autor: nota completa. vistaPublica: solo bloques públicos.
export function getNoteApi(id, token, { vistaPublica = false } = {}) {
  const query = vistaPublica ? "?vista=publica" : "";
  return apiFetch(`/api/notas/${id}/${query}`, { token });
}

export function createNoteApi(data, token) {
  return apiFetch("/api/notas/", { method: "POST", token, json: data });
}

export function updateNoteApi(id, data, token) {
  return apiFetch(`/api/notas/${id}/`, { method: "PATCH", token, json: data });
}

export function deleteNoteApi(id, token) {
  return apiFetch(`/api/notas/${id}/`, { method: "DELETE", token });
}

// --- Correcciones comunitarias ------------------------------------------------
// El autor de la nota recibe todas; cualquier otra persona, solo las que propuso.
export function getCorreccionesApi(idNota, token, { estado } = {}) {
  return apiFetch(`/api/notas/${idNota}/correcciones/${estado ? `?estado=${estado}` : ""}`, { token });
}

export function createCorreccionApi(idNota, data, token) {
  return apiFetch(`/api/notas/${idNota}/correcciones/`, { method: "POST", token, json: data });
}

// estado: "atendida" | "descartada" | "abierta" (reabrir), con respuesta opcional
export function resolverCorreccionApi(idCorreccion, data, token) {
  return apiFetch(`/api/correcciones/${idCorreccion}/`, { method: "PATCH", token, json: data });
}

export function retirarCorreccionApi(idCorreccion, token) {
  return apiFetch(`/api/correcciones/${idCorreccion}/`, { method: "DELETE", token });
}
