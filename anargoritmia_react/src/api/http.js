import { BASE_API } from "../utils/constants";

const NOMBRES_CAMPOS = {
  username: "Nombre de usuario",
  email: "Correo",
  password: "Contraseña",
  nombre: "Nombre",
  descripcion: "Descripción",
  padres: "Dependencias",
  imagen_portada: "Imagen",
  titulo: "Título",
  id_categoria: "Categoría",
  bloques: "Celdas",
};

/**
 * Convierte el cuerpo de error de DRF en un mensaje legible:
 * {"error": "..."}, {"detail": "..."} o {"campo": ["..."]}.
 */
export function formatApiError(data) {
  if (!data || typeof data !== "object") return "Error en la petición a la API";
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([campo, mensajes]) => {
      const texto = Array.isArray(mensajes) ? mensajes.join(" ") : String(mensajes);
      return campo === "non_field_errors"
        ? texto
        : `${NOMBRES_CAMPOS[campo] || campo}: ${texto}`;
    })
    .join(" | ");
}

/**
 * fetch contra la API de Anargoritmia.
 * - Lanza un Error con mensaje legible (y error.data con el cuerpo) si la
 *   respuesta no es 2xx.
 * - Devuelve null en respuestas sin cuerpo (204 No Content).
 */
export const EVENTO_SESION_EXPIRADA = "anargoritmia:sesion-expirada";

export async function apiFetch(path, { token, json, ...options } = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(json);
  }

  let response;
  try {
    response = await fetch(`${BASE_API}${path}`, { ...options, headers });
  } catch {
    // Servidor apagado, reiniciándose o sin red: no es un problema de sesión
    const sinConexion = new Error("No se pudo conectar con el servidor. Revisa tu conexión o que la API esté en marcha.");
    sinConexion.isApiError = true;
    sinConexion.status = 0;
    throw sinConexion;
  }

  // Token rechazado (expirado o inválido): la sesión termina de forma explícita
  if (response.status === 401 && token) {
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
  }

  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const mensaje =
      data && typeof data === "object"
        ? formatApiError(data)
        : response.status >= 500
          ? `El servidor tuvo un problema (HTTP ${response.status}). Inténtalo de nuevo en un momento.`
          : `Error en la petición (HTTP ${response.status}).`;
    const apiError = new Error(mensaje);
    apiError.isApiError = true;
    apiError.status = response.status;
    apiError.data = data;
    throw apiError;
  }

  return data;
}
