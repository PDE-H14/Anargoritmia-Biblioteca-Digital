/**
 * Fecha de caducidad de un JWT, leída en el propio navegador (campo `exp`).
 * No verifica la firma: solo sirve para informar al usuario.
 */
export function caducidadToken(token) {
  try {
    const carga = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(carga.padEnd(carga.length + ((4 - (carga.length % 4)) % 4), "=")));
    return exp ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

/** «el 11 de marzo de 2027 (en 120 días)» */
export function textoCaducidad(token, ahora = new Date()) {
  const fecha = caducidadToken(token);
  if (!fecha) return null;
  const dias = Math.max(0, Math.ceil((fecha - ahora) / 86400000));
  const cuando = fecha.toLocaleDateString("es-MX", { dateStyle: "long" });
  const plazo = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
  return `el ${cuando} (${plazo})`;
}
