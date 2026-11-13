import React from "react";
import { Link } from "react-router-dom";
import { Campo } from "../../../../components/UI";
import { SelectorCategorias } from "../../../../components/Common";
import { RUTAS, leerNota } from "../../../../utils/constants";
import { useNotaSugerencias } from "../../../../utils/sugerencias";
import { EtiquetasNota } from "./EtiquetasNota";

// Debe coincidir con MAX_CATEGORIAS_EXTRA en notas/api/serializers.py
const MAX_CATEGORIAS_EXTRA = 3;

/**
 * Panel lateral «Datos de la nota»: título, categoría, ficha, autoría,
 * licencia fija y, debajo (children), las correcciones de lectores.
 */
export function DatosNota({
  titulo,
  idCategoria,
  categoriasExtra = [],
  etiquetas = [],
  categorias,
  ficha,
  autoria,
  esMia,
  onCambiar,
  origen,
  ruta,
  children,
}) {
  const notaSugerencias = useNotaSugerencias();
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

      <SelectorCategorias
        id="nota-categoria"
        etiqueta="Categoría"
        categorias={categorias}
        valor={idCategoria || ""}
        vacio="Sin categoría"
        ayuda={
          notaSugerencias ? (
            <>
              ¿No encuentras la tuya?{" "}
              <a href={leerNota(notaSugerencias)} target="_blank" rel="noreferrer">
                Sugiere una categoría
              </a>
              .
            </>
          ) : null
        }
        // La principal no se repite entre las extra
        onCambiar={(id) => onCambiar({ id_categoria: id, categorias_extra: categoriasExtra.filter((c) => c !== id) })}
      />

      <SelectorCategorias
        id="nota-categorias-extra"
        etiqueta="También en"
        categorias={categorias}
        valor={categoriasExtra}
        multiple
        max={MAX_CATEGORIAS_EXTRA}
        excluir={new Set(idCategoria ? [idCategoria] : [])}
        ayuda={`Opcional: hasta ${MAX_CATEGORIAS_EXTRA} categorías más en las que también aparece en el catálogo.`}
        onCambiar={(ids) => onCambiar({ categorias_extra: ids })}
      />

      <EtiquetasNota etiquetas={etiquetas} onCambiar={(lista) => onCambiar({ etiquetas: lista })} />

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
