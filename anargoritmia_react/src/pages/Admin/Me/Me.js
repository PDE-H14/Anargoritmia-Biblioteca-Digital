import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../../hooks";
import { updateMeApi, deleteMeApi } from "../../../api/user";
import { EncabezadoPagina } from "../../../components/App";
import { Aviso, Boton, Campo, Dialogo, Logo, Tarjeta } from "../../../components/UI";
import { LOGIN_PATH } from "../../../utils/constants";
import { textoCaducidad } from "../../../utils/jwt";
import { getRefresh } from "../../../api/token";
import { firmaPropia } from "../../../utils/notas";
import "./Me.css";

const PATRON_USUARIO = /^[\w.@+-]+$/;

/** Mis datos (diseño F): perfil, contraseña y sesión, y derecho al olvido. */
export function Me() {
  const navigate = useNavigate();
  const { auth, login, logout } = useAuth();
  const me = auth.me;
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const salir = () => {
    logout();
    navigate(LOGIN_PATH, { replace: true });
  };

  // Recarga los datos de sesión (nombre del menú lateral incluido)
  const refrescar = () => login();

  // La sesión dura lo que el token de renovación, que se extiende con el uso
  const caducidad = textoCaducidad(getRefresh());

  return (
    <>
      <EncabezadoPagina titulo="Mis datos" subtitulo="Tu perfil, tu contraseña y tu derecho al olvido." />

      <div className="mis-datos">
        <Tarjeta className="mis-datos__perfil">
          <div className="perfil">
            <Logo tamano={96} className="perfil__avatar" />
            <div className="perfil__datos">
              <div className="perfil__cabecera">
                <div>
                  <h2 className="perfil__usuario">@{me.username}</h2>
                  <p className="perfil__id">
                    Identificador único: {me.id}
                    {me.is_staff && " · staff"}
                  </p>
                </div>
                <Boton onClick={() => setEditando(true)}>Editar perfil</Boton>
              </div>
              <dl className="perfil__lista">
                <div>
                  <dt>Nombre</dt>
                  <dd>{me.first_name || <span className="perfil__vacio">Sin indicar</span>}</dd>
                </div>
                <div>
                  <dt>Apellidos</dt>
                  <dd>{me.last_name || <span className="perfil__vacio">Sin indicar</span>}</dd>
                </div>
                <div className="perfil__ancho">
                  <dt>Correo electrónico</dt>
                  <dd>{me.email}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Firma de tus notas">
          <FormularioFirma me={me} token={auth.token} onGuardada={refrescar} />
        </Tarjeta>

        <Tarjeta titulo="Contraseña y sesión">
          <FormularioContrasena token={auth.token} onSesionNueva={(t) => login(t.access, t.refresh)} />
          <div className="mis-datos__sesion">
            <p>
              {caducidad
                ? `Tu sesión se renueva sola mientras la uses; si no entras, caduca ${caducidad}.`
                : "Tu sesión se renueva sola mientras la uses y caduca tras 7 días sin actividad."}
            </p>
            <Boton variante="enlace" onClick={salir}>
              Cerrar sesión
            </Boton>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Eliminar mi cuenta" variante="peligro">
          <p className="mis-datos__texto">
            Es definitivo y no pasa por ningún administrador. Tus aportes se conservan bajo la autoría de la
            comunidad; tu registro personal se destruye.
          </p>
          <div className="mis-datos__balance">
            <div>
              <h3>Se destruye</h3>
              <p>Tu usuario, tu nombre, tu correo, tu contraseña, tus sesiones y tus borradores.</p>
            </div>
            <div>
              <h3>Se conserva</h3>
              <p>Tus notas publicadas, desvinculadas de ti y firmadas como autoría comunitaria.</p>
            </div>
          </div>
          <Boton variante="destructivo" onClick={() => setEliminando(true)}>
            Eliminar mi cuenta de forma permanente
          </Boton>
        </Tarjeta>
      </div>

      <DialogoPerfil
        abierto={editando}
        me={me}
        token={auth.token}
        onCerrar={() => setEditando(false)}
        onGuardado={async () => {
          await refrescar();
          setEditando(false);
          toast.success("Perfil actualizado.");
        }}
      />

      <DialogoEliminarCuenta
        abierto={eliminando}
        me={me}
        token={auth.token}
        onCerrar={() => setEliminando(false)}
        onEliminada={() => {
          setEliminando(false);
          logout();
          navigate(LOGIN_PATH, { replace: true });
          toast.info("Tu cuenta se eliminó.");
        }}
      />
    </>
  );
}

/**
 * Con qué se firman tus notas y correcciones: alias (por omisión) o nombre
 * completo. Se aplica también a lo que ya publicaste.
 */
function FormularioFirma({ me, token, onGuardada }) {
  const [guardando, setGuardando] = useState(null);
  const nombre = [me.first_name, me.last_name].map((p) => (p || "").trim()).filter(Boolean).join(" ");
  const actual = me.firma || "alias";

  const elegir = async (firma) => {
    if (firma === actual) return;
    setGuardando(firma);
    try {
      await updateMeApi({ firma }, token);
      await onGuardada();
      toast.success("Firma actualizada en todas tus notas.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(null);
    }
  };

  const opciones = [
    { valor: "alias", titulo: "Alias", ejemplo: me.username },
    { valor: "nombre", titulo: "Nombre completo", ejemplo: nombre || "Sin nombre: se usará tu alias" },
  ];

  return (
    <div className="firma">
      <p className="mis-datos__texto">
        Así apareces en la lectura y el catálogo. Hoy tus notas se firman como <strong>{firmaPropia(me)}</strong>.
      </p>
      <div className="firma__opciones" role="radiogroup" aria-label="Firmar mis notas con">
        {opciones.map(({ valor, titulo, ejemplo }) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={actual === valor}
            className="firma__opcion"
            disabled={!!guardando}
            onClick={() => elegir(valor)}
          >
            <strong>{titulo}</strong>
            <span className="firma__ejemplo">{guardando === valor ? "Guardando…" : ejemplo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Cambio de contraseña: la API exige la actual para aceptar la nueva. */
function FormularioContrasena({ token, onSesionNueva }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!actual) encontrados.actual = "Escribe tu contraseña actual.";
    if (nueva.length < 8) encontrados.nueva = "Usa al menos 8 caracteres.";
    if (confirmacion !== nueva) encontrados.confirmacion = "No coincide con la contraseña nueva.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const respuesta = await updateMeApi({ password: nueva, password_actual: actual }, token);
      // Las demás sesiones se cerraron; esta sigue con los tokens nuevos
      if (respuesta?.tokens) await onSesionNueva(respuesta.tokens);
      setActual("");
      setNueva("");
      setConfirmacion("");
      toast.success("Contraseña actualizada. Se cerró la sesión en tus otros dispositivos.");
    } catch (error) {
      if (error.data?.password_actual) setErrores({ actual: [].concat(error.data.password_actual).join(" ") });
      else setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="mis-datos__contrasena" onSubmit={enviar} noValidate>
      <Campo id="contrasena-actual" etiqueta="Contraseña actual" error={errores.actual}>
        <input
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
      </Campo>
      <div className="dialogo__fila">
        <Campo id="contrasena-nueva" etiqueta="Contraseña nueva" error={errores.nueva}>
          <input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </Campo>
        <Campo id="contrasena-confirmacion" etiqueta="Confirmar contraseña nueva" error={errores.confirmacion}>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
          />
        </Campo>
      </div>
      {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      <div>
        <Boton type="submit" variante="principal" cargando={enviando}>
          Actualizar contraseña
        </Boton>
      </div>
    </form>
  );
}

function DialogoPerfil({ abierto, me, token, onCerrar, onGuardado }) {
  const [valores, setValores] = useState(null);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Al abrir, parte de los datos actuales
  const datos = valores || {
    username: me.username || "",
    email: me.email || "",
    first_name: me.first_name || "",
    last_name: me.last_name || "",
  };
  const cambiar = (campo) => (e) => setValores({ ...datos, [campo]: e.target.value });

  const cerrar = () => {
    setValores(null);
    setErrores({});
    onCerrar();
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (!datos.username.trim()) encontrados.username = "Escribe un nombre de usuario.";
    else if (!PATRON_USUARIO.test(datos.username)) encontrados.username = "Sin espacios; solo letras, números y _ @ + - .";
    if (!/^\S+@\S+\.\S+$/.test(datos.email)) encontrados.email = "Escribe un correo válido.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      await updateMeApi(datos, token);
      setValores(null);
      await onGuardado();
    } catch (error) {
      setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo
      abierto={abierto}
      amplio
      cerrarFuera={false}
      titulo="Editar perfil"
      onCerrar={cerrar}
      acciones={
        <>
          <Boton onClick={cerrar}>Cancelar</Boton>
          <Boton type="submit" form="form-perfil" variante="principal" cargando={enviando}>
            Guardar cambios
          </Boton>
        </>
      }
    >
      <form id="form-perfil" className="dialogo__formulario" onSubmit={enviar} noValidate>
        <div className="dialogo__fila">
          <Campo id="perfil-nombre" etiqueta="Nombre">
            <input value={datos.first_name} autoComplete="given-name" onChange={cambiar("first_name")} />
          </Campo>
          <Campo id="perfil-apellidos" etiqueta="Apellidos">
            <input value={datos.last_name} autoComplete="family-name" onChange={cambiar("last_name")} />
          </Campo>
        </div>
        <Campo id="perfil-usuario" etiqueta="Nombre de usuario" error={errores.username} ayuda="Aparece como autoría en tus notas.">
          <input value={datos.username} autoComplete="username" onChange={cambiar("username")} />
        </Campo>
        <Campo id="perfil-correo" etiqueta="Correo electrónico" error={errores.email} ayuda="Es tu dato de acceso; no se publica.">
          <input type="email" value={datos.email} autoComplete="email" onChange={cambiar("email")} />
        </Campo>
        {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      </form>
    </Dialogo>
  );
}

function DialogoEliminarCuenta({ abierto, me, token, onCerrar, onEliminada }) {
  const [valores, setValores] = useState({ correo: "", usuario: "", password: "" });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setValores({ ...valores, [campo]: e.target.value });

  const cerrar = () => {
    setValores({ correo: "", usuario: "", password: "" });
    setErrores({});
    onCerrar();
  };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = {};
    if (valores.correo !== me.email) encontrados.correo = "No coincide con el correo de tu cuenta.";
    if (valores.usuario !== me.username) encontrados.usuario = "No coincide con tu nombre de usuario.";
    if (!valores.password) encontrados.password = "Escribe tu contraseña para confirmar.";
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      // El servidor verifica la contraseña y que no seas el último administrador
      await deleteMeApi(valores.password, token);
      onEliminada();
    } catch (error) {
      setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo
      abierto={abierto}
      amplio
      cerrarFuera={false}
      titulo="Eliminar mi cuenta"
      onCerrar={cerrar}
      acciones={
        <>
          <Boton onClick={cerrar}>Cancelar</Boton>
          <Boton type="submit" form="form-eliminar-cuenta" variante="destructivo" cargando={enviando}>
            Eliminar mi cuenta
          </Boton>
        </>
      }
    >
      <form id="form-eliminar-cuenta" className="dialogo__formulario" onSubmit={enviar} noValidate>
        <Aviso tipo="advertencia" titulo="Esta acción no se puede deshacer">
          Escribe tus datos de acceso exactamente como están en tu cuenta para confirmar.
        </Aviso>
        <Campo id="eliminar-correo" etiqueta="Tu correo electrónico" error={errores.correo}>
          <input type="email" autoComplete="off" value={valores.correo} onChange={cambiar("correo")} />
        </Campo>
        <Campo id="eliminar-usuario" etiqueta="Tu nombre de usuario" error={errores.usuario}>
          <input autoComplete="off" value={valores.usuario} onChange={cambiar("usuario")} />
        </Campo>
        <Campo id="eliminar-password" etiqueta="Tu contraseña" error={errores.password}>
          <input type="password" autoComplete="current-password" value={valores.password} onChange={cambiar("password")} />
        </Campo>
        {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      </form>
    </Dialogo>
  );
}
