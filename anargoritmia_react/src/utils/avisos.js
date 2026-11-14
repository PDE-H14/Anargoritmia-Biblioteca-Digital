// Tipos de aviso de la administración, en el orden en que se ofrecen
export const TIPOS_AVISO = {
  novedad: "Novedad",
  mantenimiento: "Mantenimiento",
  importante: "Importante",
  reconocimiento: "Reconocimiento",
};

export const LUGARES_AVISO = { publico: "Sitio público", taller: "Taller" };

export function fechaAviso(iso) {
  return iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }) : "";
}

export function fechaCortaAviso(iso) {
  return iso ? new Date(iso).toLocaleDateString("es-MX", { dateStyle: "long" }) : "";
}

/** «programado», «vigente» o «terminado» según la fecha actual. */
export function estadoAviso(aviso, ahora = Date.now()) {
  if (aviso.desde && new Date(aviso.desde).getTime() > ahora) return "programado";
  if (aviso.hasta && new Date(aviso.hasta).getTime() <= ahora) return "terminado";
  return "vigente";
}

// Avisos que este navegador ya cerró (solo aquí; el servidor no se entera)
const CLAVE_CERRADOS = "anargoritmia-avisos-cerrados";

export function avisosCerrados() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_CERRADOS) || "[]"));
  } catch {
    return new Set();
  }
}

export function cerrarAviso(id) {
  try {
    const cerrados = [...avisosCerrados(), id].slice(-50);
    localStorage.setItem(CLAVE_CERRADOS, JSON.stringify(cerrados));
  } catch {
    // Sin almacenamiento (modo privado): se cierra solo en esta visita
  }
}
