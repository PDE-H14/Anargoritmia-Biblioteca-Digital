export const BASE_API = process.env.REACT_APP_BASE_API;
export const TOKEN = "token";
export const TOKEN_RENOVACION = "token-renovacion";
// Login único para usuarios y administradores
export const LOGIN_PATH = "/login";
// Alta abierta de cuentas (nunca de administrador)
export const REGISTRO_PATH = "/registro";

// Rutas de la app. /lab: espacio de trabajo de todo usuario con sesión;
// /admin: páginas exclusivas de administradores.
export const RUTAS = {
  LAB: "/lab",
  MIS_NOTAS: "/lab/mis-notas",
  CREAR: "/lab/notas/nueva",
  MIS_DATOS: "/lab/mis-datos",
  USUARIOS: "/admin/usuarios",
  CATEGORIAS: "/admin/categorias",
  CORRECCIONES: "/admin/correcciones",
  AVISOS: "/admin/avisos",
};

// Editor y lectura de notas. "nueva" crea un borrador al primer autoguardado.
export const NOTA_NUEVA = "nueva";
export const RUTA_EDITAR_NOTA = "/lab/notas/:id";
export const RUTA_LEER_NOTA = "/notas/:id";
export const RUTA_MAPA = "/red";
export const RUTA_NOVEDADES = "/novedades";
export const editarNota = (id) => `/lab/notas/${id}`;
export const leerNota = (id) => `/notas/${id}`;
