import { AdminLayout } from "../layouts";
import { HomeAdmin, UsersAdmin, Categories, Me, Notes } from "../pages/Admin";
import { CreateNote } from "../pages/Admin/Notes/CreateNote";

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
  {
    path: "admin/create",
    layout: AdminLayout,
    component: CreateNote,
  },
];

export default routesAdmin;
