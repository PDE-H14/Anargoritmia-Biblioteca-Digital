// Árbol de categorías. No es un árbol estricto: una categoría puede depender
// de varias (`padres`), así que aparece bajo cada una de ellas.

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");

/** Texto sin acentos ni mayúsculas, para filtrar por nombre. */
export function normalizar(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Índice para recorrer el árbol:
 * - raices: categorías sin padres existentes, por nombre;
 * - hijasDe(ficha): sus subcategorías directas, por nombre;
 * - descendientes(ficha) / ancestros(ficha): conjuntos de fichas (sin ciclos);
 * - ruta(categoria): [raíz, …, categoria] siguiendo el primer padre.
 */
export function indiceCategorias(categorias) {
  const lista = [...(categorias || [])].sort(porNombre);
  const porFicha = new Map(lista.map((c) => [c.ficha, c]));
  const porId = new Map(lista.map((c) => [c.id_categoria, c]));
  const padresDe = (c) => (c.padres || []).filter((p) => p !== c.ficha && porFicha.has(p));

  const hijas = new Map();
  const raices = [];
  lista.forEach((c) => {
    const padres = padresDe(c);
    if (!padres.length) raices.push(c);
    padres.forEach((p) => {
      if (!hijas.has(p)) hijas.set(p, []);
      hijas.get(p).push(c);
    });
  });
  const hijasDe = (ficha) => hijas.get(ficha) || [];

  const recorrer = (inicio, siguientes) => {
    const vistos = new Set();
    const pila = [inicio];
    while (pila.length) {
      siguientes(pila.pop()).forEach((f) => {
        if (!vistos.has(f) && f !== inicio) {
          vistos.add(f);
          pila.push(f);
        }
      });
    }
    return vistos;
  };
  const descendientes = (ficha) => recorrer(ficha, (f) => hijasDe(f).map((h) => h.ficha));
  const ancestros = (ficha) => recorrer(ficha, (f) => (porFicha.get(f) ? padresDe(porFicha.get(f)) : []));

  const ruta = (categoria) => {
    const camino = [categoria];
    const vistos = new Set([categoria.ficha]);
    let actual = categoria;
    for (;;) {
      const padre = padresDe(actual)
        .map((p) => porFicha.get(p))
        .find((p) => !vistos.has(p.ficha));
      if (!padre) return camino;
      camino.unshift(padre);
      vistos.add(padre.ficha);
      actual = padre;
    }
  };

  return { lista, porFicha, porId, raices, hijasDe, descendientes, ancestros, ruta, padresDe };
}

/** «Comunidad / Guías» */
export function nombreConRuta(indice, categoria) {
  return categoria ? indice.ruta(categoria).map((c) => c.nombre).join(" / ") : "";
}
