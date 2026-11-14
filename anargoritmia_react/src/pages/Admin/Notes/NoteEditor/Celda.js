import React from "react";
import { toast } from "react-toastify";
import { Icono } from "../../../../components/UI";
import { AnimacionAislada, FiguraSvg, MarkdownView } from "../../../../components/Notes";
import { PozoCodigo } from "./PozoCodigo";

// Huella del código con que se guardó una figura: si el código cambia, se avisa
export function huellaDe(texto = "") {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export const TIPOS = {
  texto: "Texto",
  codigo: "Código",
  animacion: "Animación",
  ejercicio: "Ejercicio",
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
const EJEMPLO_ANIMACION = `// Deslizador para el lector: nombre, mínimo, máximo, inicial y paso
const amplitud = parametro("amplitud (px)", 40, 280, 240, 10);

const punto = document.createElement("div");
punto.style.cssText = "width:40px;height:40px;border-radius:50%;background:var(--acc)";
escena.append(punto);

animate(punto, { x: amplitud, duration: 1200, alternate: true, loop: true });`;

/** Nombre de archivo sugerido mientras la celda no tenga uno propio (según tipo y lenguaje). */
export function nombreSugerido(bloque) {
  if (bloque.tipo === "animacion") return "animacion.js";
  if (bloque.tipo === "ejercicio") return "ejercicio.md";
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
  const { id, tipo, publico, contenido, lenguaje, version, notas, archivo = "", titulo = "", pista = "", solucion = "" } = bloque;
  const sugerido = nombreSugerido(bloque);
  const cambiar = (campos) => onCambiar(id, campos);
  const siguiente = () => onSiguiente(id);

  const campoTitulo = (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={`titulo-${id}`}>
        {{ codigo: "Título del algoritmo", animacion: "Título de la animación", ejercicio: "Título del ejercicio" }[tipo]}
      </label>
      <input
        id={`titulo-${id}`}
        className="campo__control"
        maxLength={200}
        placeholder={
          { codigo: "p. ej. Método de Newton-Raphson", animacion: "p. ej. Rotación de un polígono" }[tipo] ||
          "p. ej. Suma de Gauss"
        }
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
            sangrar
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

      {tipo === "ejercicio" && (
        <>
          <div className="celda__campos">
            <div className="celda__campo-ancho">{campoTitulo}</div>
          </div>
          <p className="celda__subtitulo">Enunciado</p>
          <MarkdownDividido
            id={id}
            valor={contenido}
            onCambio={(v) => cambiar({ contenido: v })}
            etiqueta={`Enunciado del ejercicio de la celda ${indice + 1}`}
            placeholder={"Lo que el lector debe resolver. Markdown y matemáticas:\nDemuestra que $\\sum_{k=1}^n k = \\frac{n(n+1)}{2}$."}
            onSiguiente={siguiente}
            registrar={(el) => registrarEditor(id, el)}
          />
          <div className="celda__pie">
            <div className="campo">
              <label className="campo__etiqueta" htmlFor={`pista-${id}`}>
                Pista (opcional)
              </label>
              <textarea
                id={`pista-${id}`}
                className="campo__control"
                rows={2}
                placeholder="Una idea para empezar, sin resolverlo (Markdown)"
                value={pista}
                onChange={(e) => cambiar({ pista: e.target.value })}
              />
            </div>
          </div>
          <p className="celda__subtitulo">Solución</p>
          <MarkdownDividido
            id={`${id}-solucion`}
            valor={solucion}
            onCambio={(v) => cambiar({ solucion: v })}
            etiqueta={`Solución del ejercicio de la celda ${indice + 1}`}
            placeholder="La solución completa; el lector la abre cuando quiere, después de intentarlo."
            onSiguiente={siguiente}
          />
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
            <label className="celda__casilla">
              <input
                type="checkbox"
                checked={!!bloque.figura}
                onChange={(e) => cambiar({ figura: e.target.checked })}
              />
              Es una figura: el lector ve una imagen fija, sin reproducir nada
            </label>
            <p className="celda__vivo-etiqueta">Prueba</p>
            <AnimacionAislada
              codigo={contenido}
              titulo={titulo || `Animación de la celda ${indice + 1}`}
              onCapturar={
                bloque.figura
                  ? (svg, error) => {
                      if (error) toast.error(error);
                      else {
                        cambiar({ svg, svg_codigo: huellaDe(contenido) });
                        toast.success("Figura guardada. Así la verá el lector.");
                      }
                    }
                  : undefined
              }
            />
            {bloque.figura && (
              <div className="celda__figura">
                <p className="celda__vivo-etiqueta">Figura que verá el lector</p>
                {bloque.svg ? (
                  <>
                    {bloque.svg_codigo !== huellaDe(contenido) && (
                      <p className="celda__aviso celda__aviso--alerta" role="status">
                        Cambiaste el código después de guardar la figura: reprodúcelo y vuelve a pulsar «Guardar como
                        figura».
                      </p>
                    )}
                    <FiguraSvg svg={bloque.svg} titulo={titulo || "Figura"} />
                    <button type="button" className="celda__enlace" onClick={() => cambiar({ svg: "", svg_codigo: "" })}>
                      Quitar la figura guardada
                    </button>
                  </>
                ) : (
                  <p className="celda__aviso">
                    Pulsa «Reproducir» y, cuando la escena se vea como quieres, «Guardar como figura». Se guarda el primer{" "}
                    <code>&lt;svg&gt;</code> de la escena (hasta 200 KB). Mientras no la guardes, el lector verá la animación.
                  </p>
                )}
              </div>
            )}
            <p className="celda__aviso">
              Dibuja dentro de <code>escena</code>. Tienes a mano <code>animate</code>, <code>createTimeline</code>,{" "}
              <code>stagger</code> y el resto de Anime.js, y los colores del tema en <code>var(--fg)</code>,{" "}
              <code>var(--acc)</code>, <code>var(--mut)</code>.
            </p>
            <p className="celda__aviso">
              <code>parametro("nombre", mín, máx, inicial, paso)</code> pone un deslizador bajo la escena y devuelve su
              valor; cuando el lector lo mueve, la animación vuelve a empezar con el nuevo valor. Hasta 6 por celda.
            </p>
          </div>
        </>
      )}
    </article>
  );
}

/** Fuente Markdown con su vista en vivo al lado (celdas de texto y ejercicios). */
function MarkdownDividido({ valor, onCambio, etiqueta, placeholder, onSiguiente, registrar }) {
  return (
    <div className="celda__dividido">
      <PozoCodigo
        ref={registrar}
        valor={valor}
        onCambio={onCambio}
        etiqueta={etiqueta}
        placeholder={placeholder}
        onSiguiente={onSiguiente}
        sangrar
      />
      <div className="celda__vivo">
        <p className="celda__vivo-etiqueta">Vista en vivo</p>
        {valor.trim() ? (
          <MarkdownView className="celda__lectura">{valor}</MarkdownView>
        ) : (
          <p className="celda__vivo-vacia">La vista aparece mientras escribes.</p>
        )}
      </div>
    </div>
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
