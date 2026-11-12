import { apiFetch } from "./http";

// Notas publicadas (solo celdas públicas), de la más reciente a la más antigua
export function getPublicNotesApi() {
  return apiFetch("/api/notas/");
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
