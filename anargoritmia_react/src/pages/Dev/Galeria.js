import React, { useState } from "react";
import { toast } from "react-toastify";
import { BotonTema } from "../../components/Common";
import {
  Logo,
  Icono,
  NOMBRES_ICONOS,
  Boton,
  Campo,
  EtiquetaEstado,
  Tabla,
  Tarjeta,
  Aviso,
  Dialogo,
  DialogoConfirmacion,
  EstadoVacio,
  Cargando,
} from "../../components/UI";
import "./Galeria.css";

/**
 * Galería de componentes base (solo en desarrollo: /dev/componentes).
 * Sirve para revisar cada pieza en claro, oscuro y a 390 px antes de
 * usarla en las pantallas. Los datos de ejemplo son ficticios.
 */
export function Galeria() {
  const [dialogo, setDialogo] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // "ok" | "falla"
  const [aviso, setAviso] = useState(true);

  return (
    <div className="galeria">
      <header className="galeria__cabecera">
        <Logo tamano={36} />
        <h1>Componentes base · diseño F</h1>
        <BotonTema />
      </header>

      <Seccion titulo="Logo e iconos">
        <div className="galeria__fila">
          <Logo tamano={56} titulo="Anargoritmia" />
          {NOMBRES_ICONOS.map((nombre) => (
            <span key={nombre} className="galeria__icono" title={nombre}>
              <Icono nombre={nombre} tamano={24} />
              <small>{nombre}</small>
            </span>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Botones">
        <div className="galeria__fila">
          <Boton variante="principal" icono="mas">
            Nueva nota
          </Boton>
          <Boton variante="secundario">Pasar a borrador</Boton>
          <Boton variante="destructivo">Eliminar mi cuenta de forma permanente</Boton>
          <Boton variante="enlace">Editar</Boton>
          <Boton variante="enlace-peligro">Eliminar</Boton>
        </div>
        <div className="galeria__fila">
          <Boton variante="principal" cargando>
            Guardando
          </Boton>
          <Boton variante="secundario" disabled>
            Deshabilitado
          </Boton>
          <Boton variante="secundario" icono="externo" href="#vista">
            Vista de lector
          </Boton>
        </div>
      </Seccion>

      <Seccion titulo="Campos">
        <div className="galeria__rejilla">
          <Campo id="g-titulo" etiqueta="Título">
            <input defaultValue="Ecuación de Schrödinger" />
          </Campo>
          <Campo id="g-categoria" etiqueta="Categoría">
            <select defaultValue="b">
              <option value="">Sin categoría</option>
              <option value="b">Bienvenida</option>
            </select>
          </Campo>
          <Campo id="g-ficha" etiqueta="Ficha" mono ayuda="Se genera a partir del título.">
            <input readOnly value="ecuacion-de-schrodinger" />
          </Campo>
          <Campo id="g-correo" etiqueta="Correo electrónico" error="Introduce un correo válido.">
            <input type="email" defaultValue="correo@" />
          </Campo>
          <Campo id="g-notas" etiqueta="Notas de replicación" className="galeria__ancho">
            <textarea placeholder="Dependencias, cómo ejecutarlo, resultados esperados…" />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Etiquetas de estado">
        <div className="galeria__fila">
          <EtiquetaEstado />
          <EtiquetaEstado borrador />
        </div>
      </Seccion>

      <Seccion titulo="Tabla">
        <Tabla descripcion="Ejemplo de tabla de notas">
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Categoría</th>
              <th>Celdas públicas</th>
              <th>Última modificación</th>
              <th className="tabla__acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Ecuación de Schrödinger</strong>
              </td>
              <td>
                <EtiquetaEstado />
              </td>
              <td>Bienvenida</td>
              <td>2 de 3</td>
              <td>Hoy, 13:09</td>
              <td className="tabla__acciones">
                <Boton variante="enlace">Editar</Boton>
                <Boton variante="enlace">Ver</Boton>
                <Boton variante="enlace-peligro">Eliminar</Boton>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Nota sin título</strong>
              </td>
              <td>
                <EtiquetaEstado borrador />
              </td>
              <td className="tabla__secundario">Sin categoría</td>
              <td>0 de 3</td>
              <td>Hace 3 días</td>
              <td className="tabla__acciones">
                <Boton variante="enlace">Editar</Boton>
                <Boton variante="enlace">Ver</Boton>
                <Boton variante="enlace-peligro">Eliminar</Boton>
              </td>
            </tr>
          </tbody>
        </Tabla>
      </Seccion>

      <Seccion titulo="Tarjetas">
        <div className="galeria__columna">
          <Tarjeta titulo="Contraseña y sesión" acciones={<Boton>Editar perfil</Boton>}>
            <p>Contenido de una tarjeta normal sobre --sur.</p>
          </Tarjeta>
          <Tarjeta titulo="Eliminar mi cuenta" variante="peligro">
            <p>Es definitivo. Tus aportes se conservan bajo la autoría de la comunidad.</p>
            <Boton variante="destructivo">Eliminar mi cuenta de forma permanente</Boton>
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion titulo="Avisos">
        <div className="galeria__columna">
          <Aviso tipo="info" titulo="Celdas privadas">
            Solo las celdas marcadas como públicas aparecen al publicar.
          </Aviso>
          <Aviso tipo="exito">Nota publicada.</Aviso>
          <Aviso tipo="advertencia" titulo="Cambios sin guardar">
            Se guardarán en cuanto dejes de escribir.
          </Aviso>
          {aviso && (
            <Aviso tipo="error" titulo="No se pudo publicar" onCerrar={() => setAviso(false)}>
              Título: Una nota publicada necesita título. | Categoría: Una nota publicada necesita categoría.
            </Aviso>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Estados">
        <div className="galeria__columna">
          <EstadoVacio
            icono="notas"
            titulo="Todavía no tienes notas."
            accion={
              <Boton variante="principal" icono="mas">
                Escribir la primera
              </Boton>
            }
          >
            Lo que escribas aquí se guarda solo y decides qué celdas se publican.
          </EstadoVacio>
          <Cargando texto="Cargando notas…" />
        </div>
      </Seccion>

      <Seccion titulo="Diálogos y notificaciones">
        <div className="galeria__fila">
          <Boton onClick={() => setDialogo(true)}>Abrir diálogo</Boton>
          <Boton variante="destructivo" onClick={() => setConfirmar("ok")}>
            Confirmar eliminación
          </Boton>
          <Boton onClick={() => setConfirmar("falla")}>Confirmación que falla</Boton>
          <Boton onClick={() => toast.success("Nota publicada.")}>Notificación de éxito</Boton>
          <Boton onClick={() => toast.error("No se pudo eliminar la categoría.")}>Notificación de error</Boton>
          <Boton onClick={() => toast.info("La nota volvió a borrador.")}>Notificación informativa</Boton>
        </div>
      </Seccion>

      <Dialogo
        abierto={dialogo}
        titulo="Editar mis datos"
        onCerrar={() => setDialogo(false)}
        acciones={
          <>
            <Boton onClick={() => setDialogo(false)}>Cancelar</Boton>
            <Boton variante="principal" onClick={() => setDialogo(false)}>
              Guardar cambios
            </Boton>
          </>
        }
      >
        <Campo id="g-dialogo-nombre" etiqueta="Nombre">
          <input defaultValue="Ada" />
        </Campo>
      </Dialogo>

      <DialogoConfirmacion
        abierto={!!confirmar}
        titulo="Eliminar nota"
        destructivo
        textoConfirmar="Eliminar"
        onCerrar={() => setConfirmar(null)}
        onConfirmar={async () => {
          await new Promise((r) => setTimeout(r, 800));
          if (confirmar === "falla") throw new Error("No se puede eliminar una categoría con notas asociadas.");
          setConfirmar(null);
          toast.success("Nota eliminada.");
        }}
      >
        <p>
          ¿Eliminar <strong>Ecuación de Schrödinger</strong>? Esta acción no se puede deshacer.
        </p>
      </DialogoConfirmacion>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section className="galeria__seccion">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}
