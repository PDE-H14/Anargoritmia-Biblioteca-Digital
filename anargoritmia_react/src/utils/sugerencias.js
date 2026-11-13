import { useEffect, useState } from "react";
import { getPublicNotesApi } from "../api/note";

// Nota pública de Comunidad donde se sugieren categorías nuevas con una
// corrección. Se busca por su ficha (generada del título «Sugerir una
// categoría»); si aún no está publicada, no se muestra el enlace.
export const FICHA_SUGERENCIAS = "sugerir-una-categoria";

let pendiente = null;

function buscarNotaSugerencias() {
  if (!pendiente) {
    pendiente = getPublicNotesApi({ q: "sugerir categoria" })
      .then((lista) => (lista || []).find((n) => n.ficha === FICHA_SUGERENCIAS) || null)
      .catch(() => {
        pendiente = null; // se reintenta en la siguiente pantalla
        return null;
      });
  }
  return pendiente;
}

/** Identificador de la nota de sugerencias, o null si no existe. */
export function useNotaSugerencias() {
  const [id, setId] = useState(null);
  useEffect(() => {
    let vigente = true;
    buscarNotaSugerencias().then((nota) => vigente && setId(nota?.id_documento || null));
    return () => {
      vigente = false;
    };
  }, []);
  return id;
}
