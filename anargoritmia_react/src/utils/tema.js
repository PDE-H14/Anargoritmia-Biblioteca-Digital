import { useCallback, useEffect, useState } from "react";

// Debe coincidir con el script en línea de public/index.html
const CLAVE = "anargoritmia-tema";
const TEMAS = ["claro", "oscuro"];

function temaGuardado() {
  try {
    const valor = localStorage.getItem(CLAVE);
    return TEMAS.includes(valor) ? valor : null;
  } catch {
    return null;
  }
}

function temaDelSistema() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

function temaActual() {
  const valor = document.documentElement.getAttribute("data-theme");
  return TEMAS.includes(valor) ? valor : temaGuardado() || temaDelSistema();
}

/**
 * Tema claro/oscuro compartido por todos los botones de la app.
 * - Primera visita: sigue `prefers-color-scheme` (y sus cambios en vivo).
 * - Tras elegir con el botón: se guarda solo en localStorage de este navegador.
 */
export function useTema() {
  const [tema, setTema] = useState(temaActual);

  // Mantiene sincronizados todos los botones (y otras pestañas)
  useEffect(() => {
    const observador = new MutationObserver(() => setTema(temaActual()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const alGuardarEnOtraPestana = (e) => {
      if (e.key === CLAVE && TEMAS.includes(e.newValue)) {
        document.documentElement.setAttribute("data-theme", e.newValue);
      }
    };
    window.addEventListener("storage", alGuardarEnOtraPestana);

    // Si nunca se ha elegido, se sigue al sistema cuando este cambia
    const consulta = window.matchMedia?.("(prefers-color-scheme: dark)");
    const alCambiarSistema = () => {
      if (!temaGuardado()) document.documentElement.setAttribute("data-theme", temaDelSistema());
    };
    consulta?.addEventListener?.("change", alCambiarSistema);

    return () => {
      observador.disconnect();
      window.removeEventListener("storage", alGuardarEnOtraPestana);
      consulta?.removeEventListener?.("change", alCambiarSistema);
    };
  }, []);

  const alternar = useCallback(() => {
    const nuevo = temaActual() === "oscuro" ? "claro" : "oscuro";
    document.documentElement.setAttribute("data-theme", nuevo);
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {
      // Sin almacenamiento (modo privado): el cambio dura solo esta visita
    }
  }, []);

  return { tema, alternar };
}
