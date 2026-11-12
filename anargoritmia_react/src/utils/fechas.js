const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDelDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

/**
 * Fecha relativa breve para tablas: «Hoy, 13:09», «Ayer, 18:40»,
 * «Hace 3 días» (hasta una semana) o «12 nov 2026».
 */
export function fechaRelativa(valor, ahora = new Date()) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  const hora = fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / DIA_MS);

  if (dias <= 0) return `Hoy, ${hora}`;
  if (dias === 1) return `Ayer, ${hora}`;
  if (dias < 7) return `Hace ${dias} días`;
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/** Fecha completa para atributos title / dateTime legibles. */
export function fechaCompleta(valor) {
  if (!valor) return "";
  return new Date(valor).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
}
