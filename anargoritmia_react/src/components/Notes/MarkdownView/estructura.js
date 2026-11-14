/*
 * Estructura de una nota: cajas (teoremas, definiciones...), ecuaciones y
 * tablas numeradas, referencias cruzadas y bibliografía, todo escrito como
 * texto dentro de las celdas.
 *
 *   :::teorema[Valor medio]{#valor-medio}
 *   Si $f$ es continua en $[a,b]$...
 *   :::
 *
 *   Por el [](#valor-medio)...          → «Por el Teorema 3...», con enlace
 *   Como prueba Apostol [@apostol1967]. → «[1]», enlazado a la bibliografía
 *
 *   :::referencias
 *   - [@apostol1967] Apostol, T. M. (1967). *Calculus*, vol. 1.
 *   :::
 *
 * Toda ecuación en bloque ($$...$$) lleva su número a la derecha; con
 * `:::ecuacion{#id}` alrededor se le da un nombre para citarla.
 *
 * La numeración abarca toda la nota: la lectura analiza primero todas sus
 * celdas públicas (`analizarEstructura`) y cada celda arranca sus contadores
 * donde terminó la anterior. Sin ese análisis (la vista previa de una celda
 * en el taller) la numeración empieza en cada celda.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import { SKIP, visit } from "unist-util-visit";

// Teoremas y afines comparten un contador, como en LaTeX con un solo `theorem`
export const CAJAS = {
  definicion: { nombre: "Definición", contador: "enunciado" },
  teorema: { nombre: "Teorema", contador: "enunciado" },
  lema: { nombre: "Lema", contador: "enunciado" },
  proposicion: { nombre: "Proposición", contador: "enunciado" },
  corolario: { nombre: "Corolario", contador: "enunciado" },
  conjetura: { nombre: "Conjetura", contador: "enunciado" },
  observacion: { nombre: "Observación", contador: "enunciado" },
  ejemplo: { nombre: "Ejemplo", contador: "enunciado" },
  demostracion: { nombre: "Demostración" },
  prueba: { nombre: "Demostración" },
  ecuacion: { nombre: "Ecuación", contador: "ecuacion" },
  tabla: { nombre: "Tabla", contador: "tabla" },
};
const CONTADORES = ["enunciado", "ecuacion", "tabla"];
const ID_VALIDO = /^[A-Za-z0-9_-]{1,60}$/;
const CITA = /\[@([A-Za-z0-9_:.-]+(?:\s*;\s*@[A-Za-z0-9_:.-]+)*)\]/g;
const CLAVE_INICIAL = /^\s*\[@([A-Za-z0-9_:.-]+)\]\s*/;

export const anclaDe = (id) => `caja-${id}`;
export const anclaReferencia = (clave) => `ref-${clave}`;

/**
 * Ajustes previos al análisis:
 * - como en Jupyter, una línea que solo contiene $$...$$ es una ecuación en
 *   bloque (remark-math la leería como matemática en línea);
 * - en los renglones de una tabla, la `|` de una fórmula ($|x|$) partiría la
 *   celda: dentro de $...$ se cambia por \vert (y `\|` por \Vert).
 */
export function normalizar(texto) {
  return (texto || "")
    .replace(/^[ \t]*\$\$([^\n]+?)\$\$[ \t]*$/gm, (_, formula) => `$$\n${formula.trim()}\n$$`)
    .replace(/^[ \t]*\|.*$/gm, (renglon) =>
      renglon.replace(/\$[^$\n]+\$/g, (formula) => formula.replace(/\\\|/g, "\\Vert{}").replace(/\|/g, "\\vert{}"))
    );
}

const procesador = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkDirective);

const idDe = (nodo) => {
  const id = nodo.attributes?.id;
  return id && ID_VALIDO.test(id) ? id : null;
};

const etiquetaPara = (caja, numero) => `${caja.nombre} ${numero}`;

/**
 * Recorre los textos de la nota en orden de lectura. Devuelve:
 * - `inicios`: por clave de texto, los contadores con que empieza;
 * - `etiquetas`: por identificador, el texto con que se cita («Teorema 3»);
 * - `citas`: por clave bibliográfica, su número.
 */
export function analizarEstructura(textos) {
  const cuenta = Object.fromEntries(CONTADORES.map((c) => [c, 0]));
  const inicios = new Map();
  const etiquetas = new Map();
  const citas = new Map();
  textos.forEach(({ clave, texto }) => {
    inicios.set(clave, { ...cuenta });
    if (!texto || !(texto.includes(":::") || texto.includes("$$"))) return;
    const arbol = procesador.parse(normalizar(texto));
    visit(arbol, (nodo) => {
      if (nodo.type === "math") {
        cuenta.ecuacion += 1;
        return undefined;
      }
      if (nodo.type !== "containerDirective") return undefined;
      if (nodo.name === "ecuacion") {
        // Se cita con el número de la ecuación que envuelve (la siguiente en contarse)
        const id = idDe(nodo);
        if (id && !etiquetas.has(id)) etiquetas.set(id, `(${cuenta.ecuacion + 1})`);
        return undefined;
      }
      if (nodo.name === "referencias") {
        visit(nodo, "listItem", (item) => {
          const coincide = primerTexto(item)?.value.match(CLAVE_INICIAL);
          if (coincide && !citas.has(coincide[1])) citas.set(coincide[1], citas.size + 1);
        });
        return SKIP;
      }
      const caja = CAJAS[nodo.name];
      if (!caja?.contador) return undefined;
      cuenta[caja.contador] += 1;
      const id = idDe(nodo);
      if (id && !etiquetas.has(id)) etiquetas.set(id, etiquetaPara(caja, cuenta[caja.contador]));
      return undefined;
    });
  });
  return { inicios, etiquetas, citas };
}

function primerTexto(nodo) {
  let encontrado = null;
  visit(nodo, "text", (t) => {
    encontrado = t;
    return false;
  });
  return encontrado;
}

const texto = (value) => ({ type: "text", value });
const elemento = (hName, className, children, extra = {}) => ({
  type: "paragraph",
  data: { hName, hProperties: { className, ...extra } },
  children,
});

/**
 * Complemento de remark que convierte las directivas en HTML con clases
 * propias. Opciones: { inicio, etiquetas, citas } (ver analizarEstructura).
 */
export function remarkEstructura({ inicio = {}, etiquetas = new Map(), citas = new Map() } = {}) {
  return (arbol, archivo) => {
    const fuente = String(archivo.value ?? "");
    const cuenta = Object.fromEntries(CONTADORES.map((c) => [c, inicio[c] || 0]));
    const original = (nodo) =>
      nodo.position ? fuente.slice(nodo.position.start.offset, nodo.position.end.offset) : `:${nodo.name}`;

    visit(arbol, (nodo, indice, padre) => {
      // «f:A→B» o «10:30 h» no son directivas: se devuelve el texto tal cual
      if (nodo.type === "textDirective") {
        padre.children[indice] = texto(original(nodo));
        return SKIP;
      }
      if (nodo.type === "leafDirective") {
        padre.children[indice] = { type: "paragraph", children: [texto(original(nodo))] };
        return SKIP;
      }
      if (nodo.type === "math") {
        // Ecuación en bloque: su número va a la derecha (MarkdownView.css)
        cuenta.ecuacion += 1;
        padre.children[indice] = {
          type: "ecuacionNumerada",
          data: { hName: "div", hProperties: { className: ["ecuacion"], "data-numero": cuenta.ecuacion } },
          children: [nodo],
        };
        return [SKIP, indice + 1];
      }
      if (nodo.type === "containerDirective") return convertirCaja(nodo, cuenta, citas);
      if (nodo.type === "link") return convertirReferencia(nodo, indice, padre, etiquetas);
      if (nodo.type === "text" && padre && nodo.value.includes("[@")) return convertirCitas(nodo, indice, padre, citas);
      return undefined;
    });
  };
}

// Separa la etiqueta `[...]` de una directiva de su contenido
function separarEtiqueta(nodo) {
  const [primero, ...resto] = nodo.children;
  if (primero?.data?.directiveLabel) return { titulo: primero.children, contenido: resto };
  return { titulo: [], contenido: nodo.children };
}

function convertirCaja(nodo, cuenta, citas) {
  const { titulo, contenido } = separarEtiqueta(nodo);
  const id = idDe(nodo);
  const extra = id ? { id: anclaDe(id) } : {};

  if (nodo.name === "referencias") {
    convertirBibliografia(nodo, contenido, titulo, citas);
    return undefined;
  }

  const caja = CAJAS[nodo.name];
  if (!caja) {
    // Directiva desconocida: se muestra el contenido sin adornos
    nodo.data = { hName: "div", hProperties: { className: ["caja", "caja--desconocida"] } };
    nodo.children = contenido;
    return undefined;
  }

  if (nodo.name === "demostracion" || nodo.name === "prueba") {
    const resumen = elemento("summary", ["caja__titulo"], [
      { type: "emphasis", children: [texto(caja.nombre)] },
      ...(titulo.length ? [texto(" ("), ...titulo, texto(")")] : []),
      texto("."),
    ]);
    nodo.data = {
      hName: "details",
      hProperties: { className: ["caja", "caja--demostracion"], ...(nodo.attributes?.abierta !== undefined ? { open: true } : {}), ...extra },
    };
    nodo.children = [resumen, ...contenido, elemento("p", ["caja__fin"], [texto("∎")], { "aria-label": "Fin de la demostración" })];
    return undefined;
  }

  if (nodo.name === "ecuacion") {
    // Solo da el ancla: el número lo pone cada ecuación en bloque
    nodo.data = { hName: "div", hProperties: { className: ["ecuacion-etiquetada"], ...extra } };
    nodo.children = contenido;
    return undefined;
  }

  cuenta[caja.contador] += 1;
  const numero = cuenta[caja.contador];

  const encabezado = elemento("p", ["caja__titulo"], [
    { type: "strong", children: [texto(`${caja.nombre} ${numero}`)] },
    ...(titulo.length ? [texto(caja.contador === "tabla" ? ". " : " ("), ...titulo, texto(caja.contador === "tabla" ? "" : ")")] : []),
    texto("."),
  ]);
  nodo.data = {
    hName: caja.contador === "tabla" ? "figure" : "section",
    hProperties: { className: ["caja", `caja--${caja.contador === "tabla" ? "tabla" : nodo.name}`], ...extra },
  };
  nodo.children = [encabezado, ...contenido];
  return undefined;
}

function convertirBibliografia(nodo, contenido, titulo, citas) {
  nodo.data = { hName: "section", hProperties: { className: ["referencias"] } };
  visit({ type: "root", children: contenido }, "listItem", (item) => {
    const inicial = primerTexto(item);
    const coincide = inicial?.value.match(CLAVE_INICIAL);
    if (!coincide) return;
    inicial.value = inicial.value.slice(coincide[0].length);
    item.data = {
      hProperties: { id: anclaReferencia(coincide[1]), className: ["referencias__entrada"], "data-numero": citas.get(coincide[1]) ?? "?" },
    };
  });
  nodo.children = [
    elemento("p", ["referencias__titulo"], titulo.length ? titulo : [texto("Referencias")]),
    ...contenido,
  ];
  nodo.children.forEach((hijo) => {
    if (hijo.type === "list") hijo.data = { hProperties: { className: ["referencias__lista"] } };
  });
}

function convertirReferencia(nodo, indice, padre, etiquetas) {
  if (!nodo.url?.startsWith("#")) return undefined;
  const id = decodeURIComponent(nodo.url.slice(1));
  const etiqueta = etiquetas.get(id);
  const vacio = nodo.children.length === 0;
  if (etiqueta) {
    nodo.url = `#${anclaDe(id)}`;
    if (vacio) nodo.children = [texto(etiqueta)];
    nodo.data = { hProperties: { className: ["referencia"] } };
    return SKIP;
  }
  if (vacio) {
    padre.children[indice] = elemento("span", ["referencia--rota"], [texto(`¿${id}?`)], {
      title: `No hay ninguna caja con el identificador «${id}» en esta nota`,
    });
    return SKIP;
  }
  return undefined;
}

function convertirCitas(nodo, indice, padre, citas) {
  const partes = [];
  let ultimo = 0;
  nodo.value.replace(CITA, (coincidencia, claves, posicion) => {
    if (posicion > ultimo) partes.push(texto(nodo.value.slice(ultimo, posicion)));
    const lista = claves.split(";").map((c) => c.trim().replace(/^@/, ""));
    partes.push(texto("["));
    lista.forEach((clave, i) => {
      if (i > 0) partes.push(texto(", "));
      const numero = citas.get(clave);
      partes.push(
        numero
          ? { type: "link", url: `#${anclaReferencia(clave)}`, data: { hProperties: { className: ["cita"] } }, children: [texto(String(numero))] }
          : elemento("span", ["referencia--rota"], [texto(`?${clave}`)], {
              title: `Falta «${clave}» en la lista de referencias de la nota`,
            })
      );
    });
    partes.push(texto("]"));
    ultimo = posicion + coincidencia.length;
    return coincidencia;
  });
  if (!partes.length) return undefined;
  if (ultimo < nodo.value.length) partes.push(texto(nodo.value.slice(ultimo)));
  padre.children.splice(indice, 1, ...partes);
  return [SKIP, indice + partes.length];
}
