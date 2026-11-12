import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./MarkdownView.css";

/**
 * Como en Jupyter/Colab, una línea que solo contiene $$...$$ es una ecuación
 * en bloque (centrada). remark-math la trataría como matemática en línea si
 * los $$ no están en líneas propias, así que se reescribe a esa forma.
 */
function normalizarEcuaciones(texto) {
  return texto.replace(/^[ \t]*\$\$([^\n]+?)\$\$[ \t]*$/gm, (_, formula) => `$$\n${formula.trim()}\n$$`);
}

/**
 * Renderiza Markdown con matemáticas ($...$ en línea y $$...$$ en bloque)
 * íntegramente en el navegador. react-markdown no interpreta HTML crudo,
 * así que el contenido de otros usuarios no puede inyectar scripts.
 */
export function MarkdownView({ children, className = "" }) {
  return (
    <div className={`markdown-view ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      >
        {normalizarEcuaciones(children || "")}
      </ReactMarkdown>
    </div>
  );
}
