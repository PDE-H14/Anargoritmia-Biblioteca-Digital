import React, { useState, useEffect } from "react";
import { Loader, Button } from "semantic-ui-react";

import {
  HeaderPage,
  UsersTable,
  AddEditUsersForm,
} from "../../../components/Admin";
import { BasicModal } from "../../../components/Common";
import { useUser } from "../../../hooks";
import "./UsersAdmin.scss";

export function UsersAdmin() {
  const [showModal, setShowModal] = useState(false);
  const [titleModal, setTitleModal] = useState(null);
  const [contentModal, setContentModal] = useState(null);
  const [refetch, setRefetch] = useState(false);

  const { loading, users, getUsers, deleteUser } = useUser();

  const openCloseModal = () => setShowModal((prev) => !prev);
  const onRefetch = () => setRefetch((prev) => !prev);

  const addUser = () => {
    setTitleModal("Nuevo usuario");
    setContentModal(
      <AddEditUsersForm onClose={openCloseModal} onRefetch={onRefetch} />,
    );
    openCloseModal();
  };

  const updateUser = (data) => {
    setTitleModal("Editar usuario");
    setContentModal(
      <AddEditUsersForm
        onClose={openCloseModal}
        onRefetch={onRefetch}
        user={data}
      />,
    );
    openCloseModal();
  };

  const onDeleteUser = (data) => {
    setTitleModal("Confirmar eliminación");
    setContentModal(
      <div className="users-admin__delete-confirm">
        <p>
          ¿Estás seguro de que deseas eliminar al usuario{" "}
          <strong>{data.username}</strong>?
        </p>
        <p className="users-admin__delete-confirm-details">
          Esta acción purgará de forma permanente el registro asociado al correo{" "}
          <code>{data.email}</code>. Esta operación no se puede revertir.
        </p>
        <div className="users-admin__delete-confirm-actions">
          <Button onClick={openCloseModal} secondary fluid>
            Cancelar
          </Button>

          <Button
            onClick={async () => {
              try {
                await deleteUser(data.id);
                openCloseModal(); // Cerramos el modal tras la remoción
                onRefetch(); // Actualizamos la tabla
              } catch (error) {
                console.error("Error al procesar la eliminación:", error);
              }
            }}
            primary
            fluid
          >
            Eliminar
          </Button>
        </div>
      </div>,
    );
    openCloseModal();
  };

  useEffect(() => {
    getUsers();
    // Con el siguiente comentario  eliminamos la advertencia
    /*
    Compiling...
Compiled with warnings.

[eslint] 
src\pages\Admin\UsersAdmin\UsersAdmin.js
  Line 61:6:  React Hook useEffect has a missing dependency: 'getUsers'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

Search for the keywords to learn more about each warning.
To ignore, add // eslint-disable-next-line to the line before.

WARNING in [eslint] 
src\pages\Admin\UsersAdmin\UsersAdmin.js
  Line 61:6:  React Hook useEffect has a missing dependency: 'getUsers'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return (
    <div>
      <HeaderPage
        className="users-admin-header"
        title="Usuarios"
        button1="Nuevo usuario"
        action1={addUser}
      />
      {loading ? (
        <Loader active inline="centered">
          Cargando...
        </Loader>
      ) : (
        <UsersTable
          users={users}
          updateUser={updateUser}
          onDeleteUser={onDeleteUser}
        />
      )}
      <BasicModal
        onClose={openCloseModal}
        title={titleModal}
        show={showModal}
        children={contentModal}
      />
    </div>
  );
}
