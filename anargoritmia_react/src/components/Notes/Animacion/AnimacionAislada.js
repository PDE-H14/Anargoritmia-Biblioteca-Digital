import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boton } from "../../UI";
import "./AnimacionAislada.css";

const ALTO_INICIAL = 300;
const ALTO_MAXIMO = 640;
// Copia local de Anime.js (scripts/copiar-vendor.js); nunca un CDN
const URL_ANIME = `${process.env.PUBLIC_URL || ""}/vendor/anime.umd.min.js`;

/*
 * La página descarga Anime.js de su propio sitio una sola vez y lo incrusta
 * en el documento aislado: el iframe no hace ninguna petición de red. (Un
 * iframe sin origen tampoco podría pedirlo: el servidor de desarrollo
 * rechaza los scripts que se piden desde otro origen.)
 */
let promesaAnime = null;
function cargarAnime() {
  if (!promesaAnime) {
    promesaAnime = fetch(URL_ANIME).then((respuesta) => {
      if (!respuesta.ok) throw new Error(`No se pudo cargar Anime.js (HTTP ${respuesta.status}).`);
      return respuesta.text();
    });
    promesaAnime.catch(() => {
      promesaAnime = null; // se reintenta en la siguiente reproducción
    });
  }
  return promesaAnime;
}

// Un «</script>» dentro de un script incrustado cerraría la etiqueta antes de tiempo
const CIERRE_SCRIPT = /<\/(script)/gi;
const incrustable = (codigo) => codigo.replace(CIERRE_SCRIPT, "<\\/$1");

// Colores del tema actual, para que la escena combine con el modo claro u oscuro
function coloresDelTema() {
  const estilo = getComputedStyle(document.documentElement);
  const leer = (nombre, respaldo) => estilo.getPropertyValue(nombre).trim() || respaldo;
  return {
    bg: leer("--sur", "#f5f6f7"),
    fg: leer("--fg", "#141210"),
    mut: leer("--mut", "#5b616e"),
    acc: leer("--brand", "#c8102e"),
    line: leer("--line-strong", "#8b919c"),
  };
}

/*
 * Documento que corre dentro del iframe. El código de la celda va en su
 * propio <script>, después de Anime.js y de preparar el entorno:
 *   - `escena`: el elemento donde dibujar;
 *   - las funciones de Anime.js como globales (animate, createTimeline, stagger, utils, svg...);
 *   - variables CSS --bg, --fg, --mut, --acc y --line con los colores del tema.
 * La política de seguridad (CSP) solo admite los scripts incrustados: el
 * documento no puede cargar nada ni conectarse a ningún servidor.
 */
function documentoAislado(codigo, bibliotecaAnime, id, colores) {
  const csp = ["default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'", "img-src data: blob:"].join(
    "; "
  );
  const idSeguro = JSON.stringify(id);
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
:root{--bg:${colores.bg};--fg:${colores.fg};--mut:${colores.mut};--acc:${colores.acc};--line:${colores.line}}
html,body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.4 system-ui,sans-serif}
html{overflow:hidden}
#escena{position:relative;min-height:${ALTO_INICIAL}px;overflow:hidden}
</style>
<script>${incrustable(bibliotecaAnime)}</script>
</head><body><div id="escena"></div>
<script>
(function () {
  var avisar = function (tipo, detalle) {
    parent.postMessage({ origen: "anargoritmia-animacion", id: ${idSeguro}, tipo: tipo, detalle: detalle }, "*");
  };
  window.__fallo = false;
  window.onerror = function (mensaje, _a, linea) {
    window.__fallo = true;
    avisar("error", String(mensaje));
    return true;
  };
  if (!window.anime) { window.__fallo = true; avisar("error", "No se pudo cargar Anime.js."); return; }
  for (var nombre in window.anime) if (!(nombre in window)) window[nombre] = window.anime[nombre];
  window.escena = document.getElementById("escena");
  window.addEventListener("message", function (e) {
    if (e.source !== parent || !e.data) return;
    if (e.data.orden === "pausar") window.anime.engine.pause();
    if (e.data.orden === "reanudar") window.anime.engine.resume();
  });
  var alto = function () { avisar("alto", document.documentElement.scrollHeight); };
  new ResizeObserver(alto).observe(document.body);
})();
</script>
<script>
${incrustable(codigo)}
</script>
<script>if (!window.__fallo) parent.postMessage({ origen: "anargoritmia-animacion", id: ${idSeguro}, tipo: "lista" }, "*");</script>
</body></html>`;
}

let contador = 0;

/**
 * Ejecuta el código de una celda de animación en un iframe aislado
 * (sandbox="allow-scripts", sin allow-same-origin): el código no puede leer
 * la sesión, el almacenamiento ni las cookies de la app, navegar la página
 * ni conectarse a internet.
 *
 * Nada se ejecuta solo: el lector pulsa «Reproducir» y controla el ritmo
 * (pausar, reanudar, reiniciar). Así una nota con un error o un ciclo
 * infinito no afecta a quien solo la abre.
 */
export function AnimacionAislada({ codigo, titulo = "Animación" }) {
  const id = useMemo(() => `animacion-${++contador}`, []);
  const iframeRef = useRef(null);
  const [fase, setFase] = useState("detenida"); // detenida | cargando | corriendo | pausada | error
  const [ejecucion, setEjecucion] = useState(0);
  const [documento, setDocumento] = useState("");
  const [error, setError] = useState(null);
  const [alto, setAlto] = useState(ALTO_INICIAL);

  // Mensajes del iframe: solo se aceptan los de su propia ventana
  useEffect(() => {
    const alRecibir = (e) => {
      const datos = e.data;
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      if (!datos || datos.origen !== "anargoritmia-animacion" || datos.id !== id) return;
      if (datos.tipo === "lista") setFase("corriendo");
      if (datos.tipo === "error") {
        setFase("error");
        setError(String(datos.detalle).slice(0, 300));
      }
      if (datos.tipo === "alto" && Number.isFinite(datos.detalle)) {
        setAlto(Math.max(ALTO_INICIAL, Math.min(ALTO_MAXIMO, Math.ceil(datos.detalle))));
      }
    };
    window.addEventListener("message", alRecibir);
    return () => window.removeEventListener("message", alRecibir);
  }, [id]);

  const reproducir = useCallback(async () => {
    setError(null);
    setAlto(ALTO_INICIAL);
    setFase("cargando");
    try {
      const biblioteca = await cargarAnime();
      setDocumento(documentoAislado(codigo || "", biblioteca, id, coloresDelTema()));
      setEjecucion((n) => n + 1);
    } catch (e) {
      setFase("error");
      setError(e.message);
    }
  }, [codigo, id]);

  const ordenar = (orden) => iframeRef.current?.contentWindow?.postMessage({ orden }, "*");
  const pausar = () => {
    ordenar("pausar");
    setFase("pausada");
  };
  const reanudar = () => {
    ordenar("reanudar");
    setFase("corriendo");
  };
  const detener = () => {
    setFase("detenida");
    setEjecucion(0);
    setDocumento("");
  };

  if (!codigo?.trim()) {
    return <p className="animacion__vacia">Esta celda de animación todavía no tiene código.</p>;
  }

  const activa = ejecucion > 0 && fase !== "detenida";

  return (
    <div className={`animacion animacion--${fase}`}>
      <div className="animacion__controles" role="group" aria-label={`Controles de ${titulo}`}>
        {!activa && (
          <Boton variante="principal" cargando={fase === "cargando"} onClick={reproducir}>
            ▶ Reproducir
          </Boton>
        )}
        {fase === "corriendo" && <Boton onClick={pausar}>Pausar</Boton>}
        {fase === "pausada" && <Boton onClick={reanudar}>Reanudar</Boton>}
        {activa && (
          <Boton variante="secundario" onClick={reproducir}>
            Reiniciar
          </Boton>
        )}
        {activa && (
          <Boton variante="enlace" onClick={detener}>
            Detener
          </Boton>
        )}
        <span className="animacion__estado" aria-live="polite">
          {fase === "pausada" && "En pausa"}
        </span>
      </div>

      {activa ? (
        <iframe
          key={ejecucion}
          ref={iframeRef}
          className="animacion__marco"
          title={titulo}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={documento}
          style={{ height: alto }}
        />
      ) : (
        <div className="animacion__portada" style={{ height: ALTO_INICIAL }}>
          <p>La animación se ejecuta solo cuando la reproduces.</p>
          <p className="animacion__nota">
            Corre aislada: no puede leer tu sesión, cambiar esta página ni conectarse a internet.
          </p>
        </div>
      )}

      {fase === "error" && (
        <p className="animacion__error" role="alert">
          La animación falló: {error}
        </p>
      )}
    </div>
  );
}
