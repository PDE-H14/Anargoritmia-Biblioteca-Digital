import React, { useState, useEffect } from "react";
import { Loader } from "semantic-ui-react";
import { useUser, useAuth } from "../../../hooks";
import {
  HeaderPage,
  EditProfileForm,
  DeleteAccountForm,
  DeleteZone,
  MyData,
} from "../../../components/Admin";
import { BasicModal } from "../../../components/Common";
import "./Me.scss";

export function Me() {
  const [showModal, setShowModal] = useState(false);
  const [titleModal, setTitleModal] = useState(null);
  const [contentModal, setContentModal] = useState(null);
  const [refetch, setRefetch] = useState(false);

  const { loading, getMe, deleteUser, updateUser } = useUser();
  const { auth, logout } = useAuth();
  const [userData, setUserData] = useState(null);

  const onRefetch = () => setRefetch((prev) => !prev);

  useEffect(() => {
    (async () => {
      try {
        const response = await getMe(auth.token);

        setUserData(response);
      } catch (error) {
        console.error("Fallo en la red o autorización:", error);
        setUserData(false);
      }
    })();
  }, [refetch]);

  const openCloseModal = () => setShowModal((prev) => !prev);

  const openEditModal = () => {
    setTitleModal("Editar mis datos");
    setContentModal(
      <EditProfileForm
        user={userData}
        onClose={openCloseModal}
        onRefetch={onRefetch}
        updateUser={updateUser}
      />,
    );
    openCloseModal();
  };

  const openDeleteModal = () => {
    setTitleModal("CONFIRMACIÓN DE SEGURIDAD");
    setContentModal(
      <DeleteAccountForm
        user={userData}
        onClose={openCloseModal}
        onDelete={async () => {
          try {
            await deleteUser(userData.id);
            openCloseModal();
            logout(); // Purga inmediata de tokens JWT del navegador
          } catch (error) {
            console.error("Error al eliminar la cuenta:", error);
          }
        }}
      />,
    );
    openCloseModal();
  };

  const headerActions = [
    {
      label: "Editar perfil",
      action: openEditModal,
      variant: "success",
      icon: "pencil",
    },
  ];

  return (
    <div className="me-page">
      <HeaderPage
        className="Me-header"
        title="Mis datos"
        btnActions={headerActions}
      />

      <div className="me-page__content">
        {loading || !userData ? (
          <Loader active inline="centered">
            Cargando datos soberanos...
          </Loader>
        ) : (
          <>
            <MyData userData={userData} />
            <DeleteZone openDeleteModal={openDeleteModal} />
          </>
        )}
      </div>

      <BasicModal
        show={showModal}
        onClose={openCloseModal}
        title={titleModal}
        children={contentModal}
      />
    </div>
  );
}
