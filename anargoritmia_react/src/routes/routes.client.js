import { PublicoLayout } from "../layouts/PublicoLayout";
import { Portada } from "../pages/Client/Portada/Portada";
import { Mapa, NoteView, Novedades } from "../pages/Client";
import { RUTA_LEER_NOTA, RUTA_MAPA, RUTA_NOVEDADES } from "../utils/constants";

// Rutas públicas (diseño F): accesibles con o sin sesión
const routesClient = [
  {
    path: "/",
    layout: PublicoLayout,
    component: Portada,
  },
  {
    path: RUTA_LEER_NOTA,
    layout: PublicoLayout,
    component: NoteView,
  },
  {
    path: RUTA_MAPA,
    layout: PublicoLayout,
    component: Mapa,
  },
  {
    path: RUTA_NOVEDADES,
    layout: PublicoLayout,
    component: Novedades,
  },
];

export default routesClient;
