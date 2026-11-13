import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boton } from "../../UI";
import "./AnimacionAislada.css";

const ALTO_INICIAL = 300;
const ALTO_MAXIMO = 640;
// Deslizadores que puede declarar una animación con parametro()
const MAX_PARAMETROS = 6;
const MAX_PASOS = 10000;
// Pausa tras mover un deslizador antes de reiniciar la escena con el nuevo valor
const ESPERA_PARAMETRO_MS = 200;
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

// JSON dentro de un <script>: sin «<» literal no puede cerrar la etiqueta
const jsonIncrustable = (valor) => JSON.stringify(valor).replace(/</g, "\\u003c");

/*
 * Documento que corre dentro del iframe. El código de la celda va en su
 * propio <script>, después de Anime.js y de preparar el entorno:
 *   - `escena`: el elemento donde dibujar;
 *   - las funciones de Anime.js como globales (animate, createTimeline, stagger, utils, svg...);
 *   - `parametro(nombre, min, max, inicial, paso)`: declara un deslizador
 *     para el lector y devuelve su valor actual (el inicial la primera vez);
 *   - variables CSS --bg, --fg, --mut, --acc y --line con los colores del tema.
 * La política de seguridad (CSP) solo admite los scripts incrustados: el
 * documento no puede cargar nada ni conectarse a ningún servidor.
 *
 * Los deslizadores se dibujan fuera del iframe, en la página: al moverlos
 * se vuelve a crear el documento con los nuevos `valores`. Así cada valor
 * arranca una escena limpia y el autor escribe código ordinario, sin
 * manejar eventos.
 */
function documentoAislado(codigo, bibliotecaAnime, id, colores, valores) {
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
  var definidos = [];
  var valores = ${jsonIncrustable(valores || {})};
  var avisar = function (tipo, detalle) {
    parent.postMessage({ origen: "anargoritmia-animacion", id: ${idSeguro}, tipo: tipo, detalle: detalle, parametros: definidos }, "*");
  };
  window.__avisar = avisar;
  window.parametro = function (nombre, min, max, inicial, paso) {
    nombre = String(nombre == null ? "" : nombre).trim().slice(0, 40);
    min = Number(min);
    max = Number(max);
    if (!nombre || !isFinite(min) || !isFinite(max) || !(min < max)) {
      throw new Error("parametro(nombre, min, max, inicial, paso): revisa el nombre y que min sea menor que max.");
    }
    paso = Number(paso);
    if (!isFinite(paso) || paso <= 0 || (max - min) / paso > ${MAX_PASOS}) paso = (max - min) / 100;
    inicial = Number(inicial);
    inicial = isFinite(inicial) ? Math.min(max, Math.max(min, inicial)) : min;
    var limitar = function (v) { v = Number(v); return isFinite(v) ? Math.min(max, Math.max(min, v)) : inicial; };
    for (var i = 0; i < definidos.length; i++) {
      if (definidos[i].nombre === nombre) return limitar(nombre in valores ? valores[nombre] : definidos[i].inicial);
    }
    if (definidos.length >= ${MAX_PARAMETROS}) throw new Error("Una animación admite hasta ${MAX_PARAMETROS} parámetros.");
    definidos.push({ nombre: nombre, min: min, max: max, inicial: inicial, paso: paso });
    return nombre in valores ? limitar(valores[nombre]) : inicial;
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
<script>if (!window.__fallo && window.__avisar) window.__avisar("lista");</script>
</body></html>`;
}

let contador = 0;

// Lo que declara el código ajeno se revisa otra vez antes de dibujarlo
function parametrosValidos(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set();
  return lista
    .filter(
      (p) =>
        p &&
        typeof p.nombre === "string" &&
        p.nombre.length > 0 &&
        p.nombre.length <= 40 &&
        !vistos.has(p.nombre) &&
        vistos.add(p.nombre) &&
        [p.min, p.max, p.inicial, p.paso].every(Number.isFinite) &&
        p.min < p.max &&
        p.paso > 0 &&
        (p.max - p.min) / p.paso <= MAX_PASOS
    )
    .slice(0, MAX_PARAMETROS)
    .map(({ nombre, min, max, inicial, paso }) => ({ nombre, min, max, inicial, paso }));
}

// Decimales con los que se muestra un valor: los del paso, hasta 4
const decimalesDe = (paso) => Math.min(4, (String(paso).split(".")[1] || "").length);
const redondear = (valor, paso) => Number(valor.toFixed(decimalesDe(paso)));

const mismosParametros = (a, b) =>
  a.length === b.length &&
  a.every((p, i) => ["nombre", "min", "max", "inicial", "paso"].every((k) => p[k] === b[i][k]));

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
  // Deslizadores que declaró el código con parametro() y los valores elegidos
  const [parametros, setParametros] = useState([]);
  const [valores, setValores] = useState({});
  const valoresRef = useRef({});
  const temporizadorRef = useRef(null);

  useEffect(() => () => clearTimeout(temporizadorRef.current), []);

  // Mensajes del iframe: solo se aceptan los de su propia ventana
  useEffect(() => {
    const alRecibir = (e) => {
      const datos = e.data;
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      if (!datos || datos.origen !== "anargoritmia-animacion" || datos.id !== id) return;
      if (datos.parametros) {
        const nuevos = parametrosValidos(datos.parametros);
        setParametros((previos) => (mismosParametros(previos, nuevos) ? previos : nuevos));
      }
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

  // `conservarEscena`: al mover un deslizador no se reinicia el alto ni se
  // ocultan los controles, para que la página no salte mientras se ajusta.
  const reproducir = useCallback(
    async (conservarEscena = false) => {
      clearTimeout(temporizadorRef.current);
      setError(null);
      if (!conservarEscena) {
        setAlto(ALTO_INICIAL);
        setFase("cargando");
      }
      try {
        const biblioteca = await cargarAnime();
        setDocumento(documentoAislado(codigo || "", biblioteca, id, coloresDelTema(), valoresRef.current));
        setEjecucion((n) => n + 1);
        if (conservarEscena) setFase("corriendo");
      } catch (e) {
        setFase("error");
        setError(e.message);
      }
    },
    [codigo, id]
  );

  const cambiarValor = (nombre, valor) => {
    valoresRef.current = { ...valoresRef.current, [nombre]: valor };
    setValores(valoresRef.current);
    clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(() => reproducir(true), ESPERA_PARAMETRO_MS);
  };
  const restablecer = () => {
    valoresRef.current = {};
    setValores({});
    reproducir(true);
  };

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
    clearTimeout(temporizadorRef.current);
    setFase("detenida");
    setEjecucion(0);
    setDocumento("");
  };

  if (!codigo?.trim()) {
    return <p className="animacion__vacia">Esta celda de animación todavía no tiene código.</p>;
  }

  const activa = ejecucion > 0 && fase !== "detenida";
  const valorDe = (p) => (Number.isFinite(valores[p.nombre]) ? valores[p.nombre] : p.inicial);
  const modificados = parametros.some((p) => valorDe(p) !== p.inicial);

  return (
    <div className={`animacion animacion--${fase}`}>
      <div className="animacion__controles" role="group" aria-label={`Controles de ${titulo}`}>
        {!activa && (
          <Boton variante="principal" cargando={fase === "cargando"} onClick={() => reproducir()}>
            ▶ Reproducir
          </Boton>
        )}
        {fase === "corriendo" && <Boton onClick={pausar}>Pausar</Boton>}
        {fase === "pausada" && <Boton onClick={reanudar}>Reanudar</Boton>}
        {activa && (
          <Boton variante="secundario" onClick={() => reproducir()}>
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

      {activa && parametros.length > 0 && (
        <fieldset className="animacion__parametros">
          <legend>Parámetros</legend>
          {parametros.map((p) => {
            const valor = valorDe(p);
            return (
              <label key={p.nombre} className="animacion__parametro">
                <span className="animacion__parametro-nombre">{p.nombre}</span>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.paso}
                  value={valor}
                  onChange={(e) => cambiarValor(p.nombre, redondear(Number(e.target.value), p.paso))}
                />
                <output className="animacion__parametro-valor">{valor.toFixed(decimalesDe(p.paso))}</output>
              </label>
            );
          })}
          {modificados && (
            <Boton variante="enlace" onClick={restablecer}>
              Valores iniciales
            </Boton>
          )}
        </fieldset>
      )}

      {fase === "error" && (
        <p className="animacion__error" role="alert">
          La animación falló: {error}
        </p>
      )}
    </div>
  );
}
