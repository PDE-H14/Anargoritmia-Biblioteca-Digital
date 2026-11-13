import React from "react";
import { Icono } from "../../../../components/UI";
import { AnimacionAislada, MarkdownView } from "../../../../components/Notes";
import { PozoCodigo } from "./PozoCodigo";

export const TIPOS = {
  texto: "Texto",
  codigo: "Código",
  animacion: "Animación",
};

const LENGUAJES = [
  "python", "javascript", "typescript", "c", "cpp", "java", "julia", "r",
  "octave", "fortran", "haskell", "rust", "go", "sql", "bash", "latex",
];

const EXTENSIONES = {
  python: "py", javascript: "js", typescript: "ts", c: "c", cpp: "cpp", "c++": "cpp",
  java: "java", julia: "jl", r: "r", octave: "m", matlab: "m", haskell: "hs",
  rust: "rs", go: "go", sql: "sql", bash: "sh", latex: "tex", fortran: "f90",
};

// Ejemplo que se muestra en una celda de animación vacía (Anime.js v4)
const EJEMPLO_ANIMACION = `const punto = document.createElement("div");
punto.style.cssText = "width:40px;height:40px;border-radius:50%;background:var(--acc)";
escena.append(punto);

animate(punto, { x: 240, duration: 1200, alternate: true, loop: true });`;

/** Nombre de archivo sugerido mientras la celda no tenga uno propio (según tipo y lenguaje). */
export function nombreSugerido(bloque) {
  if (bloque.tipo === "animacion") return "animacion.js";
  if (bloque.tipo === "codigo") {
    const lenguaje = (bloque.lenguaje || "").toLowerCase().trim().split(/\s+/)[0];
    return `codigo.${EXTENSIONES[lenguaje] || "txt"}`;
  }
  return "texto.md";
}

// Lo que acepta la API: letras, números, punto, guion y guion bajo
function limpiarArchivo(valor) {
  return valor.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_.-]/gu, "").slice(0, 80);
}

/** Celda del taller: tarjeta con cabecera de controles y su editor. */
export function Celda({
  bloque,
  indice,
  total,
  correcciones = 0,
  onCambiar,
  onMover,
  onEliminar,
  onSiguiente,
  onVerCorrecciones,
  registrarEditor,
}) {
  const { id, tipo, publico, contenido, lenguaje, version, notas, archivo = "", titulo = "" } = bloque;
  const sugerido = nombreSugerido(bloque);
  const cambiar = (campos) => onCambiar(id, campos);
  const siguiente = () => onSiguiente(id);

  const campoTitulo = (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={`titulo-${id}`}>
        {tipo === "codigo" ? "Título del algoritmo" : "Título de la animación"}
      </label>
      <input
        id={`titulo-${id}`}
        className="campo__control"
        maxLength={200}
        placeholder={tipo === "codigo" ? "p. ej. Método de Newton-Raphson" : "p. ej. Rotación de un polígono"}
        value={titulo}
        onChange={(e) => cambiar({ titulo: e.target.value })}
      />
    </div>
  );

  return (
    <article className={`celda ${publico ? "" : "celda--privada"}`} aria-label={`Celda ${indice + 1}: ${TIPOS[tipo]}`}>
      <header className="celda__cabecera">
        <p className="celda__titulo">
          <strong>{TIPOS[tipo]}</strong>
          <span className="celda__archivo">
            <span aria-hidden="true">{indice + 1}:</span>
            <input
              className="celda__archivo-campo"
              value={archivo}
              placeholder={sugerido}
              size={Math.max(8, (archivo || sugerido).length)}
              maxLength={80}
              spellCheck={false}
              aria-label={`Nombre de archivo de la celda ${indice + 1}`}
              title="Nombre de archivo (opcional)"
              onChange={(e) => cambiar({ archivo: limpiarArchivo(e.target.value) })}
            />
            {!publico && <span> · solo tú la ves</span>}
          </span>
        </p>

        {correcciones > 0 && (
          <button
            type="button"
            className="celda__correcciones"
            onClick={() => onVerCorrecciones?.(id)}
            title="Correcciones de lectores sobre esta celda"
          >
            {correcciones} {correcciones === 1 ? "corrección" : "correcciones"}
          </button>
        )}

        <div className="segmentado" role="group" aria-label="Visibilidad de la celda">
          <button type="button" aria-pressed={publico} onClick={() => cambiar({ publico: true })}>
            Pública
          </button>
          <button type="button" aria-pressed={!publico} onClick={() => cambiar({ publico: false })}>
            Privada
          </button>
        </div>

        <div className="celda__orden">
          <button
            type="button"
            className="celda__icono-boton"
            aria-label="Subir celda"
            title="Subir"
            disabled={indice === 0}
            onClick={() => onMover(id, -1)}
          >
            <Icono nombre="arriba" />
          </button>
          <button
            type="button"
            className="celda__icono-boton"
            aria-label="Bajar celda"
            title="Bajar"
            disabled={indice === total - 1}
            onClick={() => onMover(id, 1)}
          >
            <Icono nombre="abajo" />
          </button>
          <button
            type="button"
            className="celda__icono-boton celda__eliminar"
            aria-label="Eliminar celda"
            title="Eliminar"
            onClick={() => onEliminar(id)}
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
      </header>

      {tipo === "texto" && (
        <div className="celda__dividido">
          <PozoCodigo
            ref={(el) => registrarEditor(id, el)}
            valor={contenido}
            onCambio={(v) => cambiar({ contenido: v })}
            etiqueta={`Fuente Markdown de la celda ${indice + 1}`}
            placeholder={"Markdown y matemáticas:\n$e^{i\\pi}+1=0$  o  $$\\int_0^1 x\\,dx$$"}
            onSiguiente={siguiente}
          />
          <div className="celda__vivo">
            <p className="celda__vivo-etiqueta">Vista en vivo</p>
            {contenido.trim() ? (
              <MarkdownView className="celda__lectura">{contenido}</MarkdownView>
            ) : (
              <p className="celda__vivo-vacia">La vista aparece mientras escribes.</p>
            )}
          </div>
        </div>
      )}

      {tipo === "codigo" && (
        <>
          <div className="celda__campos">
            <div className="campo">
              <label className="campo__etiqueta" htmlFor={`lenguaje-${id}`}>
                Lenguaje
              </label>
              <input
                id={`lenguaje-${id}`}
                className="campo__control"
                list={`lenguajes-${id}`}
                placeholder="python, c, julia…"
                value={lenguaje}
                onChange={(e) => cambiar({ lenguaje: e.target.value })}
              />
              <datalist id={`lenguajes-${id}`}>
                {LENGUAJES.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div className="campo">
              <label className="campo__etiqueta" htmlFor={`version-${id}`}>
                Versión del intérprete
              </label>
              <input
                id={`version-${id}`}
                className="campo__control"
                placeholder="p. ej. CPython 3.12"
                value={version}
                onChange={(e) => cambiar({ version: e.target.value })}
              />
            </div>
            <div className="celda__campo-ancho">{campoTitulo}</div>
          </div>
          <PozoCodigo
            ref={(el) => registrarEditor(id, el)}
            valor={contenido}
            onCambio={(v) => cambiar({ contenido: v })}
            lenguaje={lenguaje}
            sangrar
            etiqueta={`Código de la celda ${indice + 1}`}
            placeholder="Código fuente…"
            onSiguiente={siguiente}
          />
          <div className="celda__pie">
            <div className="campo">
              <label className="campo__etiqueta" htmlFor={`notas-${id}`}>
                Notas de replicación
              </label>
              <textarea
                id={`notas-${id}`}
                className="campo__control"
                rows={2}
                placeholder="Dependencias, cómo ejecutarlo y qué resultado esperar (Markdown)"
                value={notas}
                onChange={(e) => cambiar({ notas: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {tipo === "animacion" && (
        <>
          <div className="celda__campos">
            <div className="celda__campo-ancho">{campoTitulo}</div>
          </div>
          <PozoCodigo
            ref={(el) => registrarEditor(id, el)}
            valor={contenido}
            onCambio={(v) => cambiar({ contenido: v })}
            lenguaje="javascript"
            sangrar
            etiqueta={`Código de animación de la celda ${indice + 1}`}
            placeholder={EJEMPLO_ANIMACION}
            onSiguiente={siguiente}
          />
          <div className="celda__prueba">
            <p className="celda__vivo-etiqueta">Prueba</p>
            <AnimacionAislada codigo={contenido} titulo={titulo || `Animación de la celda ${indice + 1}`} />
            <p className="celda__aviso">
              Dibuja dentro de <code>escena</code>. Tienes a mano <code>animate</code>, <code>createTimeline</code>,{" "}
              <code>stagger</code> y el resto de Anime.js, y los colores del tema en <code>var(--fg)</code>,{" "}
              <code>var(--acc)</code>, <code>var(--mut)</code>.
            </p>
          </div>
        </>
      )}
    </article>
  );
}

/** Fila para insertar una celda en esa posición («:nueva»). */
export function FilaNueva({ onAgregar, posicion }) {
  return (
    <div className="fila-nueva">
      <span className="fila-nueva__etiqueta" aria-hidden="true">
        :nueva
      </span>
      {Object.entries(TIPOS).map(([tipo, texto]) => (
        <button
          key={tipo}
          type="button"
          className="fila-nueva__boton"
          aria-label={`Insertar celda de ${texto.toLowerCase()} en la posición ${posicion + 1}`}
          onClick={() => onAgregar(tipo, posicion)}
        >
          + {texto}
        </button>
      ))}
    </div>
  );
}
