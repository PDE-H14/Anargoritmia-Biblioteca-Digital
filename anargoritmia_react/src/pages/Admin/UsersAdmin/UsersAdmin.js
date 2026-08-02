import React, { useState, useEffect } from "react";
import { Loader } from "semantic-ui-react";

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

  const onDeleteUser = async (data) => {
    const result = window.confirm(
      `¿Eliminar usuario ${data.username} con el correo ${data.email}?`,
    );
    if (result) {
      try {
        await deleteUser(data.id);
        onRefetch();
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
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
