import { BASE_API } from "../utils/constants";
import { caducidadToken } from "../utils/jwt";
import { getRefresh, getToken, setRefresh, setToken } from "./token";

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
  password_actual: "Contraseña actual",
  firma: "Firma",
  archivo: "Archivo",
  id_bloque: "Celda",
  tipo_error: "Tipo de error",
  fragmento: "Pasaje",
  revision: "Revisión",
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
export const EVENTO_TOKEN_RENOVADO = "anargoritmia:token-renovado";

const MARGEN_RENOVACION_MS = 30 * 1000;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

let renovacionEnCurso = null;

/**
 * Pide un token de acceso nuevo con el de renovación (que también rota).
 * Devuelve el token nuevo; null si la sesión ya no es válida (hay que
 * volver a entrar); undefined si no se pudo saber (sin red, error 5xx).
 * Una sola renovación a la vez, aunque varias peticiones la pidan.
 */
export function renovarSesion() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = (async () => {
      const refresh = getRefresh();
      if (!refresh) return null;
      let response;
      try {
        response = await fetch(`${BASE_API}/api/auth/renovar/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
      } catch {
        return undefined;
      }
      if (!response.ok) {
        if (response.status !== 401) return undefined;
        // Otra pestaña pudo rotar el token al mismo tiempo: si ya guardó uno nuevo, se usa
        await esperar(400);
        return getRefresh() !== refresh ? getToken() : null;
      }
      const data = await response.json();
      setToken(data.access);
      if (data.refresh) setRefresh(data.refresh);
      window.dispatchEvent(new CustomEvent(EVENTO_TOKEN_RENOVADO, { detail: data.access }));
      return data.access;
    })().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

function porCaducar(token) {
  const fecha = caducidadToken(token);
  return !!fecha && fecha.getTime() - Date.now() < MARGEN_RENOVACION_MS;
}

/**
 * `token` indica que la petición va autenticada. Se usa siempre el token más
 * reciente guardado (pudo renovarse en otra petición o pestaña); si está por
 * caducar se renueva antes, y si el servidor responde 401 se renueva y se
 * reintenta una vez. Solo si la renovación se rechaza termina la sesión.
 */
export async function apiFetch(path, { token, json, ...options } = {}, esReintento = false) {
  let vigente = token ? getToken() || token : null;
  if (vigente && !esReintento && porCaducar(vigente)) {
    vigente = (await renovarSesion()) || vigente;
  }

  const headers = { ...(options.headers || {}) };
  if (vigente) headers.Authorization = `Bearer ${vigente}`;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(json);
  }

  let response;
  try {
    response = await fetch(`${BASE_API}${path}`, { ...options, headers });
  } catch {
    // Servidor apagado, reiniciándose o sin red: no es un problema de sesión
    const sinConexion = new Error(
      "No se pudo conectar con el servidor. Si nadie lo ha usado en un rato, tarda hasta un par de minutos en despertar: espera y vuelve a intentarlo. Si sigue igual, revisa tu conexión."
    );
    sinConexion.isApiError = true;
    sinConexion.status = 0;
    throw sinConexion;
  }

  // Token rechazado: se intenta renovar una vez; si la renovación también se
  // rechaza, la sesión termina de forma explícita
  if (response.status === 401 && token) {
    if (!esReintento) {
      const nuevo = await renovarSesion();
      if (nuevo) return apiFetch(path, { token: nuevo, json, ...options }, true);
      if (nuevo === null) window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
    } else {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
    }
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

/**
 * El servidor gratuito se duerme tras 15 minutos sin uso y tarda cerca de un
 * minuto en despertar. Mientras tanto la petición falla sin respuesta
 * (status 0) o con 502/503/504: esos casos se reintentan unas veces antes de
 * mostrar el error. `alReintentar(intento)` permite avisar al lector.
 */
export const esServidorDormido = (e) => e?.status === 0 || [502, 503, 504].includes(e?.status);

export async function conReintentos(pedir, { intentos = 5, espera = 15000, alReintentar } = {}) {
  for (let intento = 1; ; intento++) {
    try {
      return await pedir();
    } catch (e) {
      if (intento >= intentos || !esServidorDormido(e)) throw e;
      alReintentar?.(intento);
      await new Promise((listo) => setTimeout(listo, espera));
    }
  }
}
