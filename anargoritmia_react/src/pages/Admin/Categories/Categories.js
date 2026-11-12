import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { getCategoriesApi, addCategoryApi, updateCategoryApi, deleteCategoryApi } from "../../../api/category";
import { EncabezadoPagina } from "../../../components/App";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Casilla,
  Dialogo,
  DialogoConfirmacion,
  EstadoVacio,
  Icono,
  Tabla,
} from "../../../components/UI";
import "./Categories.css";

/** Categorías (diseño F, solo administradores). */
export function Categories() {
  const { auth } = useAuth();
  const [categorias, setCategorias] = useState(null);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(null); // { categoria? } abierto
  const [porEliminar, setPorEliminar] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    getCategoriesApi()
      .then((lista) => setCategorias(lista || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(cargar, [cargar]);

  const nombrePorFicha = Object.fromEntries((categorias || []).map((c) => [c.ficha, c.nombre]));
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
        acciones={
          <Boton variante="principal" icono="mas" onClick={() => setFormulario({})}>
            Nueva categoría
          </Boton>
        }
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
          <Tabla descripcion="Categorías">
            <thead>
              <tr>
                <th scope="col">Portada</th>
                <th scope="col">Nombre</th>
                <th scope="col">Ficha</th>
                <th scope="col">Descripción</th>
                <th scope="col">Depende de</th>
                <th scope="col" className="tabla__acciones">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id_categoria}>
                  <td>
                    {c.imagen_portada ? (
                      <img className="categorias__portada" src={c.imagen_portada} alt="" />
                    ) : (
                      <span className="categorias__portada categorias__portada--vacia" aria-label="Sin portada">
                        <Icono nombre="carpeta" />
                      </span>
                    )}
                  </td>
                  <td className="categorias__nombre">{c.nombre}</td>
                  <td className="categorias__ficha">{c.ficha}</td>
                  <td className="categorias__descripcion">{c.descripcion || <span className="tabla__secundario">—</span>}</td>
                  <td>
                    {c.padres?.length ? (
                      <ul className="categorias__padres">
                        {c.padres.map((p) => (
                          <li key={p}>{nombrePorFicha[p] || p}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="tabla__secundario">Raíz</span>
                    )}
                  </td>
                  <td className="tabla__acciones">
                    <Boton variante="enlace" onClick={() => setFormulario({ categoria: c })} aria-label={`Editar «${c.nombre}»`}>
                      Editar
                    </Boton>
                    <Boton variante="enlace-peligro" onClick={() => setPorEliminar(c)} aria-label={`Eliminar «${c.nombre}»`}>
                      Eliminar
                    </Boton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>

      {formulario && (
        <FormularioCategoria
          categoria={formulario.categoria}
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

function FormularioCategoria({ categoria, categorias, token, onCerrar, onGuardada }) {
  const nueva = !categoria;
  const [valores, setValores] = useState({
    nombre: categoria?.nombre || "",
    descripcion: categoria?.descripcion || "",
    padres: categoria?.padres || [],
    imagen_portada: null, // archivo nuevo; sin él se conserva la portada actual
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

  const posiblesPadres = categorias.filter((c) => c.id_categoria !== categoria?.id_categoria);

  const alternarPadre = (ficha, marcado) =>
    setValores((v) => ({
      ...v,
      padres: marcado ? [...v.padres, ficha] : v.padres.filter((p) => p !== ficha),
    }));

  const elegirImagen = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!["image/jpeg", "image/png"].includes(archivo.type)) {
      setErrores((x) => ({ ...x, imagen_portada: "La portada debe ser una imagen JPG o PNG." }));
      return;
    }
    setErrores((x) => ({ ...x, imagen_portada: undefined }));
    setValores((v) => ({ ...v, imagen_portada: archivo }));
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

        <fieldset className="categorias__dependencias">
          <legend className="campo__etiqueta">Depende de</legend>
          {posiblesPadres.length === 0 ? (
            <p className="campo__ayuda">No hay otras categorías todavía; esta será raíz.</p>
          ) : (
            <div className="categorias__casillas">
              {posiblesPadres.map((c) => (
                <Casilla
                  key={c.id_categoria}
                  id={`padre-${c.id_categoria}`}
                  etiqueta={c.nombre}
                  checked={valores.padres.includes(c.ficha)}
                  onChange={(marcado) => alternarPadre(c.ficha, marcado)}
                />
              ))}
            </div>
          )}
          <p className="campo__ayuda">Sin marcar ninguna, la categoría es raíz del catálogo.</p>
        </fieldset>

        <div className="campo">
          <span className="campo__etiqueta" id="categoria-portada-etiqueta">
            Portada
          </span>
          <div className="categorias__selector">
            {vistaPrevia ? (
              <img className="categorias__vista" src={vistaPrevia} alt="Vista previa de la portada" />
            ) : (
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
                accept="image/jpeg,image/png"
                aria-labelledby="categoria-portada-etiqueta"
                onChange={elegirImagen}
              />
              <p className="campo__ayuda">
                {valores.imagen_portada ? valores.imagen_portada.name : "JPG o PNG."}
                {!nueva && !valores.imagen_portada && " Si no eliges otra, se conserva la actual."}
              </p>
            </div>
          </div>
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
