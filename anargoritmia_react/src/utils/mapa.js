import { useEffect, useMemo, useState } from "react";

import { getCategoriesApi } from "../api/category";
import { conReintentos } from "../api/http";
import { getGrafoApi } from "../api/note";
import { PALETA } from "../components/Notes";
import { indiceCategorias } from "./categorias";

// El mapa se pide una vez y se reutiliza un minuto (al pasar de nota en nota)
const VIGENCIA_MS = 60_000;
let cache = null;

function pedirMapa() {
  if (!cache || Date.now() - cache.hora > VIGENCIA_MS) {
    const promesa = conReintentos(() => Promise.all([getGrafoApi(), getCategoriesApi()]));
    cache = { hora: Date.now(), promesa };
    promesa.catch(() => {
      cache = null;
    });
  }
  return cache.promesa;
}

/**
 * Datos del mapa del procomún: notas publicadas con sus enlaces, la categoría
 * raíz de cada una y un color por raíz.
 */
export function useDatosMapa() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    pedirMapa()
      .then(([grafo, categorias]) => vigente && setDatos({ notas: grafo?.notas || [], categorias: categorias || [] }))
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, []);

  return useMemo(() => {
    if (!datos) return { cargando: !error, error };
    const indice = indiceCategorias(datos.categorias);
    const raizDe = (nota) => {
      const categoria = indice.porId.get(nota.id_categoria);
      return categoria ? indice.ruta(categoria)[0] : null;
    };
    // Los colores se reparten entre las raíces que sí tienen notas, para que no se repitan
    const usadas = new Set(datos.notas.map((n) => raizDe(n)?.id_categoria));
    const raices = indice.raices.filter((r) => usadas.has(r.id_categoria));
    const colorDeRaiz = new Map(raices.map((r, i) => [r.id_categoria, PALETA[i % (PALETA.length - 1)]]));
    const colorDe = (nota) => colorDeRaiz.get(raizDe(nota)?.id_categoria) || PALETA[PALETA.length - 1];
    return { cargando: false, error: null, notas: datos.notas, raices, raizDe, colorDe, colorDeRaiz };
  }, [datos, error]);
}
