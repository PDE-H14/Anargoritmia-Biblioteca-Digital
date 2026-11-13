import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { getCategoriesApi, addCategoryApi, updateCategoryApi, deleteCategoryApi } from "../../../api/category";
import { EncabezadoPagina } from "../../../components/App";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Dialogo,
  DialogoConfirmacion,
  EstadoVacio,
  Icono,
} from "../../../components/UI";
import { SelectorCategorias } from "../../../components/Common";
import { indiceCategorias } from "../../../utils/categorias";
import "./Categories.css";
import { ALTO_IDEAL, ANCHO_IDEAL, EditorPortada } from "./EditorPortada";
import { IndiceCategorias } from "./IndiceCategorias";

/** Categorías (diseño F, solo administradores). */
export function Categories() {
  const { auth } = useAuth();
  const [categorias, setCategorias] = useState(null);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(null); // { categoria?, padres? } abierto
  const [porEliminar, setPorEliminar] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    getCategoriesApi()
      .then((lista) => setCategorias(lista || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(cargar, [cargar]);

  const hijasDe = (categoria) => (categorias || []).filter((c) => (c.padres || []).includes(categoria.ficha));

  const eliminar = async () => {
    await deleteCategoryApi(porEliminar.id_categoria, auth.token); // un error se muestra en el diálogo
    toast.success(`Categoría «${porEliminar.nombre}» eliminada.`);
    setPorEliminar(null);
    cargar();
  };

  const hijasDelaEliminada = porEliminar ? hijasDe(porEliminar) : [];

  return (
    <>
      <EncabezadoPagina
        titulo="Categorías"
        subtitulo={categorias?.length ? `${categorias.length} ${categorias.length === 1 ? "categoría" : "categorías"}` : null}
      />

      <div className="categorias">
        {error ? (
          <Aviso tipo="error" titulo="No se pudieron cargar las categorías">
            <p>{error}</p>
            <Boton onClick={cargar}>Reintentar</Boton>
          </Aviso>
        ) : !categorias ? (
          <Cargando texto="Cargando categorías…" />
        ) : categorias.length === 0 ? (
          <EstadoVacio
            icono="carpeta"
            titulo="Aún no hay categorías."
            accion={
              <Boton variante="principal" icono="mas" onClick={() => setFormulario({})}>
                Crear la primera
              </Boton>
            }
          >
            Las categorías ordenan el catálogo público y cada nota necesita una para publicarse.
          </EstadoVacio>
        ) : (
          <IndiceCategorias
            categorias={categorias}
            onEditar={(c) => setFormulario({ categoria: c })}
            onEliminar={setPorEliminar}
            onSubcategoria={(c) => setFormulario({ padres: [c.ficha] })}
          />
        )}
      </div>

      {formulario && (
        <FormularioCategoria
          categoria={formulario.categoria}
          padresIniciales={formulario.padres}
          categorias={categorias || []}
          token={auth.token}
          onCerrar={() => setFormulario(null)}
          onGuardada={(nombre, nueva) => {
            setFormulario(null);
            toast.success(nueva ? `Categoría «${nombre}» creada.` : `Categoría «${nombre}» actualizada.`);
            cargar();
          }}
        />
      )}

      {/* Siempre a mano, aunque el índice sea largo */}
      {categorias?.length > 0 && (
        <Boton variante="principal" icono="mas" className="categorias__flotante" onClick={() => setFormulario({})}>
          Nueva categoría
        </Boton>
      )}

      {hijasDelaEliminada.length > 0 ? (
        <Dialogo
          abierto
          titulo="No se puede eliminar"
          onCerrar={() => setPorEliminar(null)}
          acciones={
            <Boton variante="principal" onClick={() => setPorEliminar(null)}>
              Entendido
            </Boton>
          }
        >
          <p>
            <strong>{porEliminar.nombre}</strong> es categoría padre de:
          </p>
          <ul>
            {hijasDelaEliminada.map((h) => (
              <li key={h.id_categoria}>{h.nombre}</li>
            ))}
          </ul>
          <p>Elimínalas o quítales esta dependencia antes de eliminarla.</p>
        </Dialogo>
      ) : (
        <DialogoConfirmacion
          abierto={!!porEliminar}
          titulo="Eliminar categoría"
          destructivo
          textoConfirmar="Eliminar"
          onCerrar={() => setPorEliminar(null)}
          onConfirmar={eliminar}
        >
          <p>
            ¿Eliminar <strong>{porEliminar?.nombre}</strong> (ficha <code>{porEliminar?.ficha}</code>) y su portada? No se
            puede deshacer. Si tiene notas asociadas, el servidor lo impedirá.
          </p>
        </DialogoConfirmacion>
      )}
    </>
  );
}

function FormularioCategoria({ categoria, padresIniciales, categorias, token, onCerrar, onGuardada }) {
  const nueva = !categoria;
  const [valores, setValores] = useState({
    nombre: categoria?.nombre || "",
    descripcion: categoria?.descripcion || "",
    padres: categoria?.padres || padresIniciales || [],
    imagen_portada: null, // archivo nuevo; sin él se conserva la portada actual
    enfoque: { x: categoria?.enfoque_x ?? 50, y: categoria?.enfoque_y ?? 50 },
  });
  const [vistaPrevia, setVistaPrevia] = useState(categoria?.imagen_portada || null);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Libera la URL temporal de la vista previa
  useEffect(
    () => () => {
      if (vistaPrevia?.startsWith("blob:")) URL.revokeObjectURL(vistaPrevia);
    },
    [vistaPrevia],
  );

  // Ni ella misma ni sus descendientes pueden ser su padre (sería un ciclo)
  const prohibidos = useMemo(() => {
    if (!categoria) return new Set();
    return new Set([categoria.ficha, ...indiceCategorias(categorias).descendientes(categoria.ficha)]);
  }, [categoria, categorias]);

  const elegirImagen = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setErrores((x) => ({ ...x, imagen_portada: "La portada debe ser una imagen JPG, PNG o WebP." }));
      return;
    }
    setErrores((x) => ({ ...x, imagen_portada: undefined }));
    // Imagen nueva: el enfoque vuelve al centro
    setValores((v) => ({ ...v, imagen_portada: archivo, enfoque: { x: 50, y: 50 } }));
    setVistaPrevia(URL.createObjectURL(archivo));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!valores.nombre.trim()) encontrados.nombre = "Escribe un nombre.";
    if (!valores.descripcion.trim()) encontrados.descripcion = "Describe el alcance de la categoría.";
    if (nueva && !valores.imagen_portada) encontrados.imagen_portada = "Elige una imagen de portada.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      if (nueva) await addCategoryApi(valores, token);
      else await updateCategoryApi(categoria.id_categoria, valores, token);
      onGuardada(valores.nombre.trim(), nueva);
    } catch (error) {
      setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo
      abierto
      amplio
      cerrarFuera={false}
      titulo={nueva ? "Nueva categoría" : `Editar «${categoria.nombre}»`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" form="form-categoria" variante="principal" cargando={enviando}>
            {nueva ? "Crear categoría" : "Guardar cambios"}
          </Boton>
        </>
      }
    >
      <form id="form-categoria" className="dialogo__formulario" onSubmit={enviar} noValidate>
        <Campo
          id="categoria-nombre"
          etiqueta="Nombre"
          error={errores.nombre}
          ayuda={nueva ? "La ficha para las direcciones se genera a partir del nombre." : `Ficha actual: ${categoria.ficha}`}
        >
          <input value={valores.nombre} maxLength={100} onChange={(e) => setValores({ ...valores, nombre: e.target.value })} />
        </Campo>

        <Campo id="categoria-descripcion" etiqueta="Descripción" error={errores.descripcion}>
          <textarea
            rows={3}
            value={valores.descripcion}
            onChange={(e) => setValores({ ...valores, descripcion: e.target.value })}
          />
        </Campo>

        {categorias.length - prohibidos.size > 0 ? (
          <SelectorCategorias
            id="categoria-padres"
            etiqueta="Depende de"
            categorias={categorias}
            clave="ficha"
            valor={valores.padres}
            multiple
            excluir={prohibidos}
            ayuda="Sin elegir ninguna, la categoría es raíz del catálogo. Puede depender de varias: aparece bajo cada una."
            onCambiar={(padres) => setValores((v) => ({ ...v, padres }))}
          />
        ) : (
          <p className="campo__ayuda">No hay otras categorías todavía; esta será raíz.</p>
        )}

        <div className="campo">
          <span className="campo__etiqueta" id="categoria-portada-etiqueta">
            Portada
          </span>
          <p className="campo__ayuda categorias__medidas">
            Ideal: <strong>{ANCHO_IDEAL} × {ALTO_IDEAL} px</strong>, horizontal (16:9); mínimo 1200 px de ancho. En
            pantallas anchas se ve como <strong>banda 4:1</strong> (una franja de 1600 × 400 px) y en pantallas
            medianas y en móvil como <strong>ficha 4:3</strong> (1200 × 900 px). No se deforma: se recorta alrededor del
            punto de enfoque que elijas. Se guarda como WebP de máximo 1600 px.
          </p>
          <div className="categorias__selector">
            {!vistaPrevia && (
              <span className="categorias__vista categorias__portada--vacia">
                <Icono nombre="carpeta" tamano={28} />
              </span>
            )}
            <div>
              <label className="boton boton--secundario" htmlFor="categoria-portada">
                {vistaPrevia ? "Cambiar imagen" : "Elegir imagen"}
              </label>
              <input
                id="categoria-portada"
                className="solo-lectores"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-labelledby="categoria-portada-etiqueta"
                onChange={elegirImagen}
              />
              <p className="campo__ayuda">
                {valores.imagen_portada ? valores.imagen_portada.name : "JPG, PNG o WebP."}
                {!nueva && !valores.imagen_portada && " Si no eliges otra, se conserva la actual."}
              </p>
            </div>
          </div>
          {vistaPrevia && (
            <EditorPortada
              src={vistaPrevia}
              enfoque={valores.enfoque}
              onCambiar={(enfoque) => setValores((v) => ({ ...v, enfoque }))}
            />
          )}
          {errores.imagen_portada && (
            <p className="campo__error">
              <Icono nombre="error" tamano={16} />
              {errores.imagen_portada}
            </p>
          )}
        </div>

        {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      </form>
    </Dialogo>
  );
}
