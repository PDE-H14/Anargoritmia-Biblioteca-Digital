import React, { useRef, useState } from "react";
import { Boton } from "../../../components/UI";

// Proporciones del catálogo (pages/Client/Portada/Portada.css)
const BANDA = 4 / 1;
const FICHA = 4 / 3;
// Tamaño recomendado: cubre la banda (1600 × 400) y la ficha (1200 × 900)
export const ANCHO_IDEAL = 1600;
export const ALTO_IDEAL = 900;
const ANCHO_MINIMO = 1200;
const PASO_TECLADO = 5;

const limitar = (v) => Math.min(100, Math.max(0, Math.round(v * 10) / 10));

/**
 * Parte de la imagen que se ve en un recorte de proporción `caja` con
 * object-fit: cover y object-position: x% y% (en fracciones de la imagen).
 */
function regionVisible(anchoImagen, altoImagen, caja, x, y) {
  const proporcion = anchoImagen / altoImagen;
  const ancho = proporcion > caja ? caja / proporcion : 1;
  const alto = proporcion > caja ? 1 : proporcion / caja;
  return {
    left: `${(1 - ancho) * x}%`,
    top: `${(1 - alto) * y}%`,
    width: `${ancho * 100}%`,
    height: `${alto * 100}%`,
  };
}

function avisoDeTamano({ ancho, alto }) {
  if (!ancho) return null;
  if (alto > ancho) return "La imagen es vertical: la banda solo mostrará una franja angosta. Funciona mejor una horizontal.";
  if (ancho < ANCHO_MINIMO) return `Mide ${ancho} × ${alto} px: en pantallas anchas se verá borrosa. Usa al menos ${ANCHO_MINIMO} px de ancho.`;
  return null;
}

/**
 * Portada de una categoría: elegir el punto de enfoque y ver cómo queda.
 * El catálogo recorta la misma imagen como banda 4:1 (columna ancha) y como
 * ficha 4:3 (columna media y móvil); los dos recortes se hacen alrededor del
 * punto de enfoque, con el mismo CSS que estas vistas previas.
 */
export function EditorPortada({ src, enfoque, onCambiar }) {
  const marcoRef = useRef(null);
  const arrastrandoRef = useRef(false);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const { x, y } = enfoque;
  const posicion = `${x}% ${y}%`;

  const desdePuntero = (evento) => {
    const caja = marcoRef.current.getBoundingClientRect();
    onCambiar({
      x: limitar(((evento.clientX - caja.left) / caja.width) * 100),
      y: limitar(((evento.clientY - caja.top) / caja.height) * 100),
    });
  };

  const alPresionar = (evento) => {
    arrastrandoRef.current = true;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    desdePuntero(evento);
  };
  const alMover = (evento) => arrastrandoRef.current && desdePuntero(evento);
  const alSoltar = () => {
    arrastrandoRef.current = false;
  };

  const alTeclear = (evento) => {
    const paso = evento.shiftKey ? 1 : PASO_TECLADO;
    const movimientos = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] };
    const delta = movimientos[evento.key];
    if (!delta) return;
    evento.preventDefault();
    onCambiar({ x: limitar(x + delta[0]), y: limitar(y + delta[1]) });
  };

  const aviso = avisoDeTamano(tamano);

  return (
    <div className="editor-portada">
      <div className="editor-portada__original">
        <p className="editor-portada__instruccion" id="enfoque-ayuda">
          Haz clic o arrastra sobre lo más importante de la imagen. Con el teclado: flechas (Mayús para pasos finos).
        </p>
        <div
          ref={marcoRef}
          className="editor-portada__marco"
          tabIndex={0}
          role="group"
          aria-label={`Punto de enfoque: ${Math.round(x)} % horizontal, ${Math.round(y)} % vertical`}
          aria-describedby="enfoque-ayuda"
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={alTeclear}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setTamano({ ancho: e.currentTarget.naturalWidth, alto: e.currentTarget.naturalHeight })}
          />
          {tamano.ancho > 0 && (
            <>
              <span
                className="editor-portada__region editor-portada__region--banda"
                style={regionVisible(tamano.ancho, tamano.alto, BANDA, x, y)}
                aria-hidden="true"
              >
                <span>Banda</span>
              </span>
              <span
                className="editor-portada__region editor-portada__region--ficha"
                style={regionVisible(tamano.ancho, tamano.alto, FICHA, x, y)}
                aria-hidden="true"
              >
                <span>Ficha</span>
              </span>
            </>
          )}
          <span className="editor-portada__punto" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true" />
        </div>
        <div className="editor-portada__datos">
          <span>
            Enfoque: {Math.round(x)} % · {Math.round(y)} %
            {tamano.ancho > 0 && ` · imagen de ${tamano.ancho} × ${tamano.alto} px`}
          </span>
          {(x !== 50 || y !== 50) && (
            <Boton variante="enlace" onClick={() => onCambiar({ x: 50, y: 50 })}>
              Centrar
            </Boton>
          )}
        </div>
        {aviso && <p className="editor-portada__aviso">{aviso}</p>}
      </div>

      <div className="editor-portada__previas" aria-label="Así se verá en el catálogo" role="group">
        <figure>
          <div className="editor-portada__banda">
            <img src={src} alt="" style={{ objectPosition: posicion }} />
          </div>
          <figcaption>Banda 4:1 · pantallas anchas</figcaption>
        </figure>
        <figure>
          <div className="editor-portada__ficha">
            <img src={src} alt="" style={{ objectPosition: posicion }} />
          </div>
          <figcaption>Ficha 4:3 · pantallas medianas y móvil</figcaption>
        </figure>
      </div>
    </div>
  );
}
