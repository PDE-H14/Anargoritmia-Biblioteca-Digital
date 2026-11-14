import React from "react";
import { Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts";
import { Avisos, HomeAdmin, UsersAdmin, Categories, Me, Moderacion } from "../pages/Admin";
import { NoteEditor, MyNotes } from "../pages/Admin/Notes";
import { RUTAS, RUTA_EDITAR_NOTA } from "../utils/constants";

const SinLayout = ({ children }) => children;
const IrAlLab = () => <Navigate to={RUTAS.LAB} replace />;

// /lab/*: cualquier usuario con sesión.
// /admin/*: solo administradores (staffOnly); el resto vuelve a /lab.
const routesAdmin = [
  {
    path: RUTAS.LAB,
    layout: AdminLayout,
    component: HomeAdmin,
  },
  {
    path: RUTAS.MIS_NOTAS,
    layout: AdminLayout,
    component: MyNotes,
  },
  {
    // Incluye /lab/notas/nueva (RUTAS.CREAR): el editor crea el borrador al primer guardado
    path: RUTA_EDITAR_NOTA,
    layout: AdminLayout,
    component: NoteEditor,
  },
  {
    path: RUTAS.MIS_DATOS,
    layout: AdminLayout,
    component: Me,
  },
  {
    path: RUTAS.USUARIOS,
    layout: AdminLayout,
    component: UsersAdmin,
    staffOnly: true,
  },
  {
    path: RUTAS.CATEGORIAS,
    layout: AdminLayout,
    component: Categories,
    staffOnly: true,
  },
  {
    path: RUTAS.CORRECCIONES,
    layout: AdminLayout,
    component: Moderacion,
    staffOnly: true,
  },
  {
    path: RUTAS.AVISOS,
    layout: AdminLayout,
    component: Avisos,
    staffOnly: true,
  },
  {
    // /admin a secas no tiene página propia
    path: "/admin",
    layout: SinLayout,
    component: IrAlLab,
  },
];

export default routesAdmin;
