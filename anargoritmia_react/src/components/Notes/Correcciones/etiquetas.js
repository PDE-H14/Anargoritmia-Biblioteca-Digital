const TIPOS = { texto: "Texto", codigo: "Código", animacion: "Animación" };

/** «Celda 2 · Código · newton.py», o un extracto del texto si no tiene nombre ni título. */
export function etiquetaCelda(bloque, indice) {
  const base = `Celda ${indice + 1} · ${TIPOS[bloque.tipo] || bloque.tipo}`;
  const nombre = bloque.titulo || bloque.archivo;
  if (nombre) return `${base} · ${nombre}`;
  const extracto = (bloque.contenido || "").replace(/\s+/g, " ").trim().slice(0, 48);
  return extracto ? `${base} · «${extracto}${bloque.contenido.length > 48 ? "…" : ""}»` : base;
}
