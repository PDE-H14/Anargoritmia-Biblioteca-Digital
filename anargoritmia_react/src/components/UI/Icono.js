import React from "react";

/*
 * Iconos de línea propios (24×24, trazo 1.8, color heredado).
 * Sustituyen poco a poco a la fuente de iconos de Semantic UI.
 * Siempre decorativos: el texto o el aria-label del control da el significado.
 */
const TRAZOS = {
  recientes: <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />,
  notas: (
    <>
      <path d="M6 3h11.5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M9 3v18M12 8h3.5M12 11.5h3.5" />
    </>
  ),
  carpeta: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  lapiz: <path d="M15.5 4.5l4 4L9 19H5v-4zM13.5 6.5l4 4" />,
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6M15.5 4.9a3.1 3.1 0 0 1 0 6.2M17.2 13.9c2.2.6 3.8 2.6 3.8 5.6" />
    </>
  ),
  ficha: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="10.8" r="2" />
      <path d="M5.5 16c.4-1.6 1.6-2.5 3-2.5s2.6.9 3 2.5M14 10h4M14 13.5h4" />
    </>
  ),
  salir: <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10M15 8l4 4-4 4M19 12H9" />,
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M9 4v16" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  // Estante con tres lomos: el catálogo público
  catalogo: <path d="M4 4h3.5v16H4zM9.5 4H13v16H9.5zM15 5.2l3.3-.9 3.2 15.2-3.3.9zM3 20.5h18" />,
  guardar: <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 4v5h7V4M8 20v-6h8v6" />,
  arriba: <path d="M12 19V5M6 11l6-6 6 6" />,
  abajo: <path d="M12 5v14M6 13l6 6 6-6" />,
  atras: <path d="M19 12H5M11 6l-6 6 6 6" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  basura: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />,
  externo: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  copiar: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ),
  ojo: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  ojoTachado: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 4l16 16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </>
  ),
  exito: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.5" />
    </>
  ),
  advertencia: <path d="M12 4 2.8 19.5h18.4zM12 10v4.5M12 17v.4" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
};

export function Icono({ nombre, tamano = 20, className = "" }) {
  const trazo = TRAZOS[nombre];
  if (!trazo) return null;
  return (
    <svg
      className={`icono ${className}`}
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {trazo}
    </svg>
  );
}

export const NOMBRES_ICONOS = Object.keys(TRAZOS);
