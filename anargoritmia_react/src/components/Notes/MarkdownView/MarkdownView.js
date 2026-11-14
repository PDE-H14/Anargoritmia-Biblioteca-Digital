import React, { createContext, useContext, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./MarkdownView.css";

import { analizarEstructura, normalizar, remarkEstructura } from "./estructura";

const OPCIONES_KATEX = { throwOnError: false, strict: false };
const REHYPE = [[rehypeKatex, OPCIONES_KATEX]];

/**
 * Estructura de toda la nota (numeración, referencias cruzadas y
 * bibliografía). La lectura la calcula una vez con `analizarEstructura` y la
 * reparte; cada MarkdownView indica con `clave` qué texto de la nota es.
 */
export const EstructuraNota = createContext(null);

/**
 * Renderiza Markdown con matemáticas ($...$ en línea y $$...$$ en bloque),
 * tablas y demás extensiones de GitHub, y las cajas de teoremas, íntegramente
 * en el navegador. react-markdown no interpreta HTML crudo, así que el
 * contenido de otros usuarios no puede inyectar scripts.
 */
export function MarkdownView({ children, className = "", clave }) {
  const estructura = useContext(EstructuraNota);
  const texto = useMemo(() => normalizar(children), [children]);
  // Sin la estructura de la nota (vista previa de una celda), la celda se numera sola
  const local = useMemo(
    () => (estructura && clave ? null : analizarEstructura([{ clave: "celda", texto: children }])),
    [estructura, clave, children]
  );
  const opciones = local
    ? { inicio: {}, etiquetas: local.etiquetas, citas: local.citas }
    : { inicio: estructura.inicios.get(clave) || {}, etiquetas: estructura.etiquetas, citas: estructura.citas };

  return (
    <div className={`markdown-view ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkDirective, [remarkEstructura, opciones]]}
        rehypePlugins={REHYPE}
        remarkRehypeOptions={{
          // Cada texto numera sus notas al pie desde 1: el prefijo evita ids repetidos en la página
          clobberPrefix: `${(clave || "celda").replace(/[^A-Za-z0-9_-]/g, "-")}-`,
          footnoteLabel: "Notas al pie",
          footnoteBackLabel: (i) => `Volver a la llamada ${i + 1}`,
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}

// En un título solo caben fórmulas y énfasis: lo demás se reduce a su texto
const NO_EN_LINEA = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "hr", "a", "img", "table"];

/** Una línea de texto con fórmulas ($\pi$), cursivas o negritas: para títulos. */
export function TextoEnLinea({ children, className = "" }) {
  return (
    <span className={`texto-en-linea ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={REHYPE}
        disallowedElements={NO_EN_LINEA}
        unwrapDisallowed
      >
        {children || ""}
      </ReactMarkdown>
    </span>
  );
}
