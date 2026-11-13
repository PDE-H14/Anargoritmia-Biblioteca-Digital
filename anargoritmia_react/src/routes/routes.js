import React, { lazy, Suspense } from "react";
import routesAdmin from "./routes.admin";
import routesClient from "./routes.client";
import { Error404 } from "../pages";
import { LoginAdmin, Registro } from "../pages/Admin";
import { GuestLayout, LOGIN_PATH } from "../layouts";
import { REGISTRO_PATH } from "../utils/constants";
import { PublicoLayout } from "../layouts/PublicoLayout";

const SinLayout = ({ children }) => children;

// Galería de componentes: solo en desarrollo. Al compilar para producción
// esta rama se elimina y el código de la galería no entra en el bundle.
const routesDesarrollo = [];
if (process.env.NODE_ENV === "development") {
  const Galeria = lazy(() => import("../pages/Dev/Galeria").then((m) => ({ default: m.Galeria })));
  routesDesarrollo.push({
    path: "/dev/componentes",
    layout: SinLayout,
    component: () => (
      <Suspense fallback={null}>
        <Galeria />
      </Suspense>
    ),
  });
}

const routes = [
  // Login general: usuarios y administradores entran por aquí
  {
    path: LOGIN_PATH,
    layout: GuestLayout,
    component: LoginAdmin,
  },
  // Alta abierta: cualquiera crea su cuenta para escribir y corregir
  {
    path: REGISTRO_PATH,
    layout: GuestLayout,
    component: Registro,
  },
  ...routesAdmin,
  ...routesClient,
  ...routesDesarrollo,
  {
    path: "*",
    layout: PublicoLayout,
    component: Error404,
  },
];
export default routes;
