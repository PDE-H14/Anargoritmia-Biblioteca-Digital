import { useEffect, useMemo, useState } from "react";

import { getCategoriesApi } from "../api/category";
import { conReintentos } from "../api/http";
import { getGrafoApi } from "../api/note";
import { indiceCategorias } from "./categorias";

// La red se pide una vez y se reutiliza un minuto (al pasar de nota en nota)
const VIGENCIA_MS = 60_000;
const cache = new Map();

function pedirRed(borradores, token) {
  const clave = borradores ? `borradores:${token}` : "publica";
  const guardado = cache.get(clave);
  if (!guardado || Date.now() - guardado.hora > VIGENCIA_MS) {
    const promesa = conReintentos(() => Promise.all([getGrafoApi({ borradores, token }), getCategoriesApi()]));
    cache.set(clave, { hora: Date.now(), promesa });
    promesa.catch(() => cache.delete(clave));
  }
  return cache.get(clave).promesa;
}

/**
 * Datos de la red del procomún: notas con sus enlaces y, para cada una, su
 * categoría raíz (el grupo en que se dibuja) y la ruta de su categoría.
 * `borradores`: con sesión, agrega los borradores propios.
 */
export function useDatosRed({ borradores = false, token } = {}) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const conBorradores = borradores && !!token;

  useEffect(() => {
    let vigente = true;
    setError(null);
    pedirRed(conBorradores, token)
      .then(([red, categorias]) => vigente && setDatos({ notas: red?.notas || [], categorias: categorias || [] }))
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [conBorradores, token]);

  return useMemo(() => {
    if (!datos) return { cargando: !error, error };
    const indice = indiceCategorias(datos.categorias);
    const categoriaDe = (nota) => indice.porId.get(nota.id_categoria) || null;
    const raizDe = (nota) => {
      const c = categoriaDe(nota);
      return c ? indice.ruta(c)[0] : null;
    };
    const grupoDe = (nota) => {
      const r = raizDe(nota);
      return r ? { id: r.id_categoria, nombre: r.nombre } : null;
    };
    const rutaDe = (nota) => {
      const c = categoriaDe(nota);
      return c ? indice.ruta(c).map((x) => x.nombre).join(" / ") : "";
    };
    return { cargando: false, error: null, notas: datos.notas, grupoDe, rutaDe };
  }, [datos, error]);
}
