import { AdminLayout } from "../layouts";
import { LoginAdmin } from "../pages/Admin";

const routesAdmin = [
  {
    path: "/admin",
    layout: AdminLayout,
    component: LoginAdmin,
  },
];

export default routesAdmin;
