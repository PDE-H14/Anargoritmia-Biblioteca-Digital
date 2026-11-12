import React from "react";
import { Icono } from "../../../../components/UI";
import { MarkdownView } from "../../../../components/Notes";
import { PozoCodigo } from "./PozoCodigo";

export const TIPOS = {
  texto: "Texto",
  codigo: "Código",
  animacion: "Animación",
};

const LENGUAJES = [
  "python", "javascript", "typescript", "c", "cpp", "java", "julia", "r",
  "octave", "haskell", "rust", "go", "sql", "bash", "latex",
];

const EXTENSIONES = {
  python: "py", javascript: "js", typescript: "ts", c: "c", cpp: "cpp", "c++": "cpp",
  java: "java", julia: "jl", r: "r", octave: "m", matlab: "m", haskell: "hs",
  rust: "rs", go: "go", sql: "sql", bash: "sh", latex: "tex",
};

/*
 * Nombre de archivo que se muestra en la cabecera («2:codigo.py»).
 * PENDIENTE (rediseño de la colección de notas): la API aún no guarda un
 * nombre por celda; mientras tanto se deriva del tipo y del lenguaje.
 */
export function nombreArchivo(bloque, indice) {
  let nombre = "texto.md";
  if (bloque.tipo === "animacion") nombre = "animacion.js";
  if (bloque.tipo === "codigo") {
    const lenguaje = (bloque.lenguaje || "").toLowerCase().trim().split(/\s+/)[0];
    nombre = `codigo.${EXTENSIONES[lenguaje] || "txt"}`;
  }
  return `${indice + 1}:${nombre}`;
}

/** Celda del taller: tarjeta con cabecera de controles y su editor. */
export function Celda({ bloque, indice, total, onCambiar, onMover, onEliminar, onSiguiente, registrarEditor }) {
  const { id, tipo, publico, contenido, lenguaje, version, notas } = bloque;
  const archivo = nombreArchivo(bloque, indice);
  const cambiar = (campos) => onCambiar(id, campos);
  const siguiente = () => onSiguiente(id);

  return (
    <article className={`celda ${publico ? "" : "celda--privada"}`} aria-label={`Celda ${indice + 1}: ${TIPOS[tipo]}`}>
      <header className="celda__cabecera">
        <p className="celda__titulo">
          <strong>{TIPOS[tipo]}</strong>
          <span className="celda__archivo">
            {archivo}
            {!publico && " · solo tú la ves"}
          </span>
        </p>

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
          <PozoCodigo
            ref={(el) => registrarEditor(id, el)}
            valor={contenido}
            onCambio={(v) => cambiar({ contenido: v })}
            lenguaje="javascript"
            sangrar
            etiqueta={`Código de animación de la celda ${indice + 1}`}
            placeholder="anime({ targets: '#figura', translateX: 180 });"
            onSiguiente={siguiente}
          />
          <p className="celda__aviso">El código se guarda. Su ejecución en un entorno aislado llegará en una próxima versión.</p>
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
