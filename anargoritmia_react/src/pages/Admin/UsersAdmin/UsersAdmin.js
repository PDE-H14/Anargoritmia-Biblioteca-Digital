import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi } from "../../../api/user";
import { EncabezadoPagina } from "../../../components/App";
import { Aviso, Boton, Campo, Cargando, Casilla, Dialogo, DialogoConfirmacion, Tabla } from "../../../components/UI";
import "./UsersAdmin.css";

const PATRON_USUARIO = /^[\w.@+-]+$/;

/** Usuarios (diseño F, solo administradores). */
export function UsersAdmin() {
  const { auth } = useAuth();
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(null); // { usuario? }
  const [porEliminar, setPorEliminar] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    getUsersApi(auth.token)
      .then(setUsuarios)
      .catch((e) => setError(e.message));
  }, [auth.token]);

  useEffect(cargar, [cargar]);

  const eliminar = async () => {
    await deleteUserApi(porEliminar.id, auth.token); // un error se muestra en el diálogo
    toast.success(`Usuario @${porEliminar.username} eliminado.`);
    setPorEliminar(null);
    cargar();
  };

  const staff = usuarios?.filter((u) => u.is_staff).length ?? 0;

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios"
        subtitulo={
          usuarios
            ? `${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"} · ${staff} con administración`
            : null
        }
        acciones={
          <Boton variante="principal" icono="mas" onClick={() => setFormulario({})}>
            Nuevo usuario
          </Boton>
        }
      />

      <div className="usuarios">
        {error ? (
          <Aviso tipo="error" titulo="No se pudieron cargar los usuarios">
            <p>{error}</p>
            <Boton onClick={cargar}>Reintentar</Boton>
          </Aviso>
        ) : !usuarios ? (
          <Cargando texto="Cargando usuarios…" />
        ) : (
          <Tabla descripcion="Usuarios">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Activo</th>
                <th scope="col">Administración</th>
                <th scope="col" className="tabla__acciones">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const soyYo = u.id === auth.me?.id;
                const nombre = [u.first_name, u.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={u.id}>
                    <td className="usuarios__alias">
                      @{u.username}
                      {soyYo && <span className="usuarios__tu"> (tú)</span>}
                    </td>
                    <td>{nombre || <span className="tabla__secundario">Sin indicar</span>}</td>
                    <td className="usuarios__correo">{u.email}</td>
                    <td>
                      <SiNo valor={u.is_active} />
                    </td>
                    <td>
                      <SiNo valor={u.is_staff} />
                    </td>
                    <td className="tabla__acciones">
                      <Boton variante="enlace" onClick={() => setFormulario({ usuario: u })} aria-label={`Editar a @${u.username}`}>
                        Editar
                      </Boton>
                      {soyYo ? (
                        <span className="usuarios__nota" title="Tu propia cuenta se elimina desde Mis datos">
                          Desde Mis datos
                        </span>
                      ) : (
                        <Boton variante="enlace-peligro" onClick={() => setPorEliminar(u)} aria-label={`Eliminar a @${u.username}`}>
                          Eliminar
                        </Boton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </div>

      {formulario && (
        <FormularioUsuario
          usuario={formulario.usuario}
          token={auth.token}
          onCerrar={() => setFormulario(null)}
          onGuardado={(alias, nuevo) => {
            setFormulario(null);
            toast.success(nuevo ? `Usuario @${alias} creado.` : `Usuario @${alias} actualizado.`);
            cargar();
          }}
        />
      )}

      <DialogoConfirmacion
        abierto={!!porEliminar}
        titulo="Eliminar usuario"
        destructivo
        textoConfirmar="Eliminar usuario"
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={eliminar}
      >
        <p>
          ¿Eliminar a <strong>@{porEliminar?.username}</strong> ({porEliminar?.email})? Sus borradores se borran y sus
          notas publicadas pasan a la autoría de la comunidad. No se puede deshacer.
        </p>
      </DialogoConfirmacion>
    </>
  );
}

/** Sí/No escrito, no solo un icono o un color. */
function SiNo({ valor }) {
  return <span className={`si-no ${valor ? "si-no--si" : "si-no--no"}`}>{valor ? "Sí" : "No"}</span>;
}

function FormularioUsuario({ usuario, token, onCerrar, onGuardado }) {
  const nuevo = !usuario;
  const [valores, setValores] = useState({
    email: usuario?.email || "",
    username: usuario?.username || "",
    first_name: usuario?.first_name || "",
    last_name: usuario?.last_name || "",
    password: "",
    is_active: usuario ? usuario.is_active : true,
    is_staff: usuario ? usuario.is_staff : false,
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setValores({ ...valores, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!/^\S+@\S+\.\S+$/.test(valores.email)) encontrados.email = "Escribe un correo válido.";
    if (!valores.username.trim()) encontrados.username = "Escribe un nombre de usuario.";
    else if (!PATRON_USUARIO.test(valores.username)) encontrados.username = "Sin espacios; solo letras, números y _ @ + - .";
    if (nuevo && !valores.password) encontrados.password = "Asigna una contraseña inicial.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    const datos = { ...valores };
    if (!datos.password) delete datos.password; // vacía = no cambiarla

    setEnviando(true);
    try {
      if (nuevo) await createUserApi(datos, token);
      else await updateUserApi(usuario.id, datos, token);
      onGuardado(datos.username, nuevo);
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
      titulo={nuevo ? "Nuevo usuario" : `Editar a @${usuario.username}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" form="form-usuario" variante="principal" cargando={enviando}>
            {nuevo ? "Crear usuario" : "Guardar cambios"}
          </Boton>
        </>
      }
    >
      <form id="form-usuario" className="dialogo__formulario" onSubmit={enviar} noValidate>
        <Campo id="usuario-correo" etiqueta="Correo electrónico" error={errores.email} ayuda="Es su dato de acceso.">
          <input type="email" autoComplete="off" value={valores.email} onChange={cambiar("email")} />
        </Campo>
        <Campo id="usuario-alias" etiqueta="Nombre de usuario" error={errores.username}>
          <input autoComplete="off" value={valores.username} onChange={cambiar("username")} />
        </Campo>
        <div className="dialogo__fila">
          <Campo id="usuario-nombre" etiqueta="Nombre">
            <input value={valores.first_name} onChange={cambiar("first_name")} />
          </Campo>
          <Campo id="usuario-apellidos" etiqueta="Apellidos">
            <input value={valores.last_name} onChange={cambiar("last_name")} />
          </Campo>
        </div>
        <Campo
          id="usuario-password"
          etiqueta={nuevo ? "Contraseña inicial" : "Contraseña nueva"}
          error={errores.password}
          ayuda={nuevo ? "Compártela con la persona por un medio seguro." : "Déjala vacía para no cambiarla."}
        >
          <input type="password" autoComplete="new-password" value={valores.password} onChange={cambiar("password")} />
        </Campo>
        <div className="dialogo__fila">
          <Casilla
            id="usuario-activo"
            etiqueta="Cuenta activa"
            descripcion="Sin ella no puede iniciar sesión."
            checked={valores.is_active}
            onChange={(v) => setValores({ ...valores, is_active: v })}
          />
          <Casilla
            id="usuario-staff"
            etiqueta="Administración"
            descripcion="Gestiona categorías y usuarios."
            checked={valores.is_staff}
            onChange={(v) => setValores({ ...valores, is_staff: v })}
          />
        </div>
        {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      </form>
    </Dialogo>
  );
}
