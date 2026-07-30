import routesAdmin from "./routes.admin";
import routesClient from "./routes.client";
import { Error404 } from "../pages";
import { AdminLayout, SimpleLayout } from "../layouts";

const routes = [
  ...routesAdmin,
  ...routesClient,
  {
    path: "*",
    layout: AdminLayout,
    component: Error404,
  },
];
export default routes;
