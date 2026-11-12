import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Error404.css";

/** Página no encontrada (diseño F, armazón público). */
export function Error404() {
  useEffect(() => {
    document.title = "Página no encontrada · Anargoritmia";
    return () => {
      document.title = "Anargoritmia";
    };
  }, []);

  return (
    <section className="error404" aria-labelledby="error404-titulo">
      <p className="error404__codigo" aria-hidden="true">
        404
      </p>
      <h1 id="error404-titulo" className="error404__titulo">
        Esta página no existe.
      </h1>
      <p className="error404__texto">¡Te perdiste en un grafo dirigido! Ningún camino lleva hasta aquí.</p>
      <div className="error404__acciones">
        <Link to="/" className="error404__principal">
          Volver al catálogo
        </Link>
      </div>
    </section>
  );
}
