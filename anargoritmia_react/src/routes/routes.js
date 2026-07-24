import routesAdmin from "./routes.admin";
import routesClient from "./routes.client";
import { Error404 } from "../pages";
import { ClientLayout } from "../layouts";

const routes = [
  ...routesAdmin,
  ...routesClient,
  {
    path: "*",
    layout: ClientLayout,
    component: Error404,
  },
];
export default routes;
