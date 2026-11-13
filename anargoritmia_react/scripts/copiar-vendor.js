/*
 * Copia a public/vendor/ las bibliotecas que se cargan dentro del entorno
 * aislado de las animaciones (un iframe sin acceso a la app). Se ejecuta
 * solo antes de `yarn start` y `yarn build`; la copia no se versiona
 * (ver .gitignore): la fuente única es el paquete instalado en node_modules.
 */
const fs = require("fs");
const path = require("path");

const ARCHIVOS = [
  // Anime.js v4, paquete UMD: expone la variable global `anime`
  ["animejs/dist/bundles/anime.umd.min.js", "anime.umd.min.js"],
];

const raiz = path.join(__dirname, "..");
const destino = path.join(raiz, "public", "vendor");
fs.mkdirSync(destino, { recursive: true });
for (const [origen, nombre] of ARCHIVOS) {
  // Ruta directa: el paquete no exporta sus bundles para require()
  fs.copyFileSync(path.join(raiz, "node_modules", origen), path.join(destino, nombre));
}
console.log(`Bibliotecas del entorno aislado copiadas en public/vendor (${ARCHIVOS.length}).`);
