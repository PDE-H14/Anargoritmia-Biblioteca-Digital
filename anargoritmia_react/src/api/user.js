import { apiFetch } from "./http";

export async function loginApi(formValues) {
  try {
    return await apiFetch("/api/auth/login/", { method: "POST", json: formValues });
  } catch (error) {
    if (error.status === 401) {
      throw new Error("Usuario o contraseña incorrectos");
    }
    throw error;
  }
}

// Crea una cuenta (sin privilegios) y devuelve sus datos con un par de tokens
export function registroApi(datos) {
  return apiFetch("/api/auth/registro/", { method: "POST", json: datos });
}

// Revoca el token de renovación en el servidor (salir de verdad, no solo olvidar el token)
export function logoutApi(refresh) {
  return apiFetch("/api/auth/salir/", { method: "POST", json: { refresh } });
}

export function getMeApi(token) {
  return apiFetch("/api/auth/me/", { token });
}

export function getUsersApi(token) {
  return apiFetch("/api/usuarios/", { token });
}

export function createUserApi(formValues, token) {
  return apiFetch("/api/usuarios/", { method: "POST", token, json: formValues });
}

export function updateUserApi(id, formValues, token) {
  return apiFetch(`/api/usuarios/${id}/`, { method: "PATCH", token, json: formValues });
}

export function deleteUserApi(id, token) {
  return apiFetch(`/api/usuarios/${id}/`, { method: "DELETE", token });
}

export function updateMeApi(formValues, token) {
  return apiFetch("/api/auth/me/", { method: "PATCH", token, json: formValues });
}

// La contraseña se envía para que el backend confirme la identidad antes de borrar.
export function deleteMeApi(password, token) {
  return apiFetch("/api/auth/me/", { method: "DELETE", token, json: { password } });
}
