import React from "react";
import { Campo } from "../../../../components/UI";

/** Panel lateral «Datos de la nota»: título, categoría, ficha, autoría y licencia fija. */
export function DatosNota({ titulo, idCategoria, categorias, ficha, autoria, onCambiar }) {
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

      <Campo id="nota-autoria" etiqueta="Autoría">
        <input readOnly value={autoria} />
      </Campo>

      <div className="datos-nota__licencia">
        <p className="campo__etiqueta" id="nota-licencia">
          Licencia
        </p>
        <p className="sello-licencia">CC BY-SA 4.0</p>
        <p className="datos-nota__nota">Fija para todo el contenido. No se puede cambiar ni ceder.</p>
      </div>
    </aside>
  );
}
