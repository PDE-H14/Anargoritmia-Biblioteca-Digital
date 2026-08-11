import { AdminLayout } from "../layouts";
import { HomeAdmin, UsersAdmin, Categories, Me } from "../pages/Admin";

const routesAdmin = [
  {
    path: "/admin",
    layout: AdminLayout,
    component: HomeAdmin,
  },
  {
    path: "/admin/users",
    layout: AdminLayout,
    component: UsersAdmin,
  },
  {
    path: "/admin/categories",
    layout: AdminLayout,
    component: Categories,
  },
  {
    path: "admin/me",
    layout: AdminLayout,
    component: Me,
  },
];

export default routesAdmin;
