import React from "react";

/*
 * Resaltado de palabras reservadas, compartido por el taller (PozoCodigo)
 * y la lectura (NoteView), para que el código se vea igual en los dos.
 * Es deliberadamente sencillo: solo colorea palabras clave, sin analizar
 * cadenas ni comentarios. Para agregar un lenguaje basta con sumar su lista
 * a PALABRAS y, si se escribe de varias formas, sus alias a ALIAS.
 */

const PALABRAS = {
  python:
    "and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield",
  javascript:
    "async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null of return super switch this throw true try typeof undefined var void while yield",
  c: "auto break case char const continue default do double else enum extern float for goto if include int long return short signed sizeof static struct switch typedef union unsigned void volatile while define",
  julia:
    "abstract begin break catch const continue do else elseif end export false finally for function global if import in let local macro module mutable quote return struct true try using where while",
  r: "break else FALSE for function if in Inf NA NaN next NULL repeat return TRUE while library",
  java: "abstract boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true false try void while",
  fortran:
    "allocatable allocate call case character complex contains cycle deallocate dimension do double else elseif end endif enddo exit function if implicit in inout integer intent interface logical module none out parameter precision print program read real recursive result return select stop subroutine then type use where while write",
};
PALABRAS.cpp = `${PALABRAS.c} bool catch class delete false namespace new nullptr private protected public template this throw true try using virtual`;
PALABRAS.typescript = `${PALABRAS.javascript} interface type enum implements private public readonly`;

const ALIAS = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  "c++": "cpp",
  jl: "julia",
  f: "fortran",
  f77: "fortran",
  f90: "fortran",
  f95: "fortran",
  gfortran: "fortran",
};

// Lenguajes que no distinguen mayúsculas: PRINT, Print y print son la misma palabra
const SIN_MAYUSCULAS = new Set(["fortran"]);

/** Expresión regular con las palabras reservadas del lenguaje, o null si no se conoce. */
export function expresionDe(lenguaje) {
  if (!lenguaje) return null;
  const clave = lenguaje.toLowerCase().trim().split(/\s+/)[0];
  const nombre = ALIAS[clave] || clave;
  const lista = PALABRAS[nombre];
  if (!lista) return null;
  const banderas = SIN_MAYUSCULAS.has(nombre) ? "gi" : "g";
  return new RegExp(`\\b(${lista.split(" ").join("|")})\\b`, banderas);
}

/** Parte una línea en texto y <span className={clase}> para cada palabra reservada. */
export function resaltar(linea, expresion, clase) {
  if (!expresion) return linea;
  const partes = [];
  let ultimo = 0;
  linea.replace(expresion, (palabra, _grupo, indice) => {
    if (indice > ultimo) partes.push(linea.slice(ultimo, indice));
    partes.push(
      <span key={indice} className={clase}>
        {palabra}
      </span>
    );
    ultimo = indice + palabra.length;
    return palabra;
  });
  partes.push(linea.slice(ultimo));
  return partes;
}
