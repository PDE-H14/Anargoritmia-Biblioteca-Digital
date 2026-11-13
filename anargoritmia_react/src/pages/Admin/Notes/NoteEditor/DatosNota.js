import React from "react";
import { Link } from "react-router-dom";
import { Campo } from "../../../../components/UI";
import { RUTAS, leerNota } from "../../../../utils/constants";

/**
 * Panel lateral «Datos de la nota»: título, categoría, ficha, autoría,
 * licencia fija y, debajo (children), las correcciones de lectores.
 */
export function DatosNota({ titulo, idCategoria, categorias, ficha, autoria, esMia, onCambiar, origen, ruta, children }) {
  return (
    <aside className="datos-nota" aria-labelledby="datos-nota-titulo">
      <h2 id="datos-nota-titulo" className="datos-nota__titulo">
        Datos de la nota
      </h2>

      <Campo id="nota-titulo" etiqueta="Título">
        <input
          value={titulo}
          maxLength={255}
          placeholder="Nota sin título"
          onChange={(e) => onCambiar({ titulo: e.target.value })}
        />
      </Campo>

      <Campo id="nota-categoria" etiqueta="Categoría">
        <select value={idCategoria || ""} onChange={(e) => onCambiar({ id_categoria: e.target.value })}>
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="nota-ficha" etiqueta="Ficha" mono ayuda={ficha ? null : "Se genera a partir del título al guardar."}>
        <input readOnly value={ficha || ""} />
      </Campo>

      <Campo
        id="nota-autoria"
        etiqueta="Autoría"
        ayuda={
          esMia ? (
            <>
              Firma pública. Elige alias o nombre completo en <Link to={RUTAS.MIS_DATOS}>Mis datos</Link>.
            </>
          ) : null
        }
      >
        <input readOnly value={autoria} />
      </Campo>

      {origen && (
        <div className="datos-nota__origen">
          <p className="campo__etiqueta">Basada en</p>
          <p className="datos-nota__nota">
            <a href={leerNota(origen.id_documento)} target="_blank" rel="noreferrer">
              {origen.titulo || "Nota sin título"}
            </a>{" "}
            de {origen.firma || "autoría comunitaria"}. La atribución se muestra al publicar, como pide la licencia.
          </p>
        </div>
      )}

      {ruta}

      <div className="datos-nota__licencia">
        <p className="campo__etiqueta" id="nota-licencia">
          Licencia
        </p>
        <p className="sello-licencia">CC BY-SA 4.0</p>
        <p className="datos-nota__nota">Fija para todo el contenido. No se puede cambiar ni ceder.</p>
      </div>

      {children}
    </aside>
  );
}
