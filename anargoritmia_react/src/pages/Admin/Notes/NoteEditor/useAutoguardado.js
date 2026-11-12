import { useCallback, useEffect, useRef, useState } from "react";

const RETARDO_MS = 1500;

/**
 * Autoguardado con retardo de inactividad (debounce) y cola:
 * - `marcarCambio()` tras cada edición; se guarda RETARDO_MS después de la última.
 * - Nunca hay dos guardados simultáneos: uno nuevo espera al anterior. Así el
 *   primer guardado (POST que crea la nota) no se duplica.
 * - `guardarAhora()` fuerza el guardado pendiente (p. ej. antes de publicar).
 *
 * `persistir()` recibe la función real de guardado y debe lanzar si falla.
 */
export function useAutoguardado(persistir) {
  const [version, setVersion] = useState(0);
  const [estado, setEstado] = useState({ fase: "limpio", hora: null, error: null });
  const sucioRef = useRef(false);
  const enCursoRef = useRef(null);
  const persistirRef = useRef(persistir);
  persistirRef.current = persistir;

  const marcarCambio = useCallback(() => {
    sucioRef.current = true;
    setEstado((e) => ({ ...e, fase: "pendiente", error: null }));
    setVersion((v) => v + 1);
  }, []);

  const guardarAhora = useCallback(async () => {
    while (enCursoRef.current) await enCursoRef.current;
    if (!sucioRef.current) return true;

    sucioRef.current = false;
    setEstado((e) => ({ ...e, fase: "guardando" }));
    const tarea = (async () => {
      try {
        await persistirRef.current();
        setEstado({
          fase: sucioRef.current ? "pendiente" : "guardado",
          hora: new Date(),
          error: null,
        });
        return true;
      } catch (error) {
        sucioRef.current = true; // se reintenta con la siguiente edición
        setEstado((e) => ({ ...e, fase: "error", error: error.message }));
        return false;
      }
    })();
    enCursoRef.current = tarea;
    const ok = await tarea;
    enCursoRef.current = null;
    return ok;
  }, []);

  // Debounce: cada cambio reinicia el temporizador
  useEffect(() => {
    if (!version) return undefined;
    const temporizador = setTimeout(guardarAhora, RETARDO_MS);
    return () => clearTimeout(temporizador);
  }, [version, guardarAhora]);

  // Aviso del navegador si se intenta salir con cambios sin guardar
  useEffect(() => {
    const alSalir = (e) => {
      if (sucioRef.current || enCursoRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, []);

  // Al salir del editor dentro de la app, guarda lo pendiente
  useEffect(() => () => {
    if (sucioRef.current) guardarAhora();
  }, [guardarAhora]);

  const reiniciar = useCallback(() => {
    sucioRef.current = false;
    setEstado({ fase: "limpio", hora: null, error: null });
  }, []);

  return { estado, marcarCambio, guardarAhora, reiniciar };
}
