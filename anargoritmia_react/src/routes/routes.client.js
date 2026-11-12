import { PublicoLayout } from "../layouts/PublicoLayout";
import { Portada } from "../pages/Client/Portada/Portada";
import { NoteView } from "../pages/Client";
import { RUTA_LEER_NOTA } from "../utils/constants";

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
];

export default routesClient;
