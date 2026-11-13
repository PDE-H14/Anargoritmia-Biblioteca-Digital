// Utilidades compartidas por el catálogo, Recientes, Mis notas, la lectura y el taller.

export const ALIAS_COMUNIDAD = "Comunidad Anargoritmia";

const NOMBRES_TIPO = { texto: "texto", codigo: "código", animacion: "animación" };

/** «texto + código» a partir de los tipos de celdas públicas que entrega el listado. */
export function tiposDeCeldas(celdas) {
  const tipos = celdas?.tipos_publicos || [];
  return tipos.map((t) => NOMBRES_TIPO[t] || t).join(" + ") || "sin celdas";
}

/** Firma pública del autor (alias o nombre completo, según eligió); null si es comunitaria. */
export function firmaAutor(autor) {
  const firma = autor?.firma || autor?.alias;
  return !firma || firma === ALIAS_COMUNIDAD ? null : firma;
}

/** Cómo se firmarán las notas de la persona con sesión iniciada. */
export function firmaPropia(me) {
  if (!me) return "";
  const nombre = [me.first_name, me.last_name].map((p) => (p || "").trim()).filter(Boolean).join(" ");
  return me.firma === "nombre" && nombre ? nombre : me.username;
}

export const TIPOS_ERROR = {
  matematico: "Error matemático",
  codigo: "El código falla",
  replicacion: "No se puede replicar",
  redaccion: "Redacción confusa o errata",
  referencia: "Falta o es incorrecta una referencia",
};

// Debe coincidir con ERRORES_POR_CELDA en notas/api/correcciones.py
export const ERRORES_POR_CELDA = {
  texto: ["matematico", "redaccion", "referencia"],
  codigo: ["codigo", "replicacion", "matematico", "redaccion"],
  animacion: ["codigo", "matematico", "redaccion"],
};

export const AYUDA_ERROR = {
  matematico: "Una fórmula, un paso de la demostración o un resultado no es correcto.",
  codigo: "No compila, no corre o da otro resultado del que dice la nota.",
  replicacion: "Faltan dependencias, la versión o los pasos para reproducirlo.",
  redaccion: "Una errata, una ambigüedad o una explicación que se presta a confusión.",
  referencia: "Falta citar la fuente o la cita no corresponde.",
};

export const MIN_DESCRIPCION = 20;
