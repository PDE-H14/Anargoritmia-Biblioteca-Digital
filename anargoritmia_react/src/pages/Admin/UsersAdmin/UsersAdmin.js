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

  const { loading, users, getUsers } = useUser();

  const openCloseModal = () => setShowModal((prev) => !prev);

  const addUser = () => {
    setTitleModal("Nuevo usuario");
    setContentModal(<AddEditUsersForm />);
    openCloseModal();
  };

  useEffect(() => {
    getUsers();
  }, []);

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
        <UsersTable users={users} />
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
