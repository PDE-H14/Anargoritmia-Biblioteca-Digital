import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [titleModal, setTitleModal] = useState(null);
  const [contentModal, setContentModal] = useState(null);
  const [refetch, setRefetch] = useState(false);

  const { loading, getMe, deleteMe, updateMe } = useUser();
  const { auth, logout } = useAuth();
  const [userData, setUserData] = useState(null);

  const onRefetch = () => setRefetch((prev) => !prev);

  useEffect(() => {
    if (!auth || !auth.token) {
      return;
    }
    (async () => {
      try {
        const response = await getMe(auth.token);
        if (!response) {
          throw new Error("El hook getMe devolvió undefined.");
        }
        setUserData(response);
      } catch (error) {
        console.error("Fallo en la red o autorización:", error);
        setUserData(false);
      }
    })();
  }, [auth, refetch]);

  const openCloseModal = () => setShowModal((prev) => !prev);

  const openEditModal = () => {
    setTitleModal("Editar mis datos");
    setContentModal(
      <EditProfileForm
        user={userData}
        onClose={openCloseModal}
        onRefetch={onRefetch}
        updateUser={updateMe}
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
            await deleteMe(); // Dispara la petición al backend
          } catch (error) {
            console.error("Error capturado tras el borrado:", error);
          } finally {
            // EL BLOQUE FINALLY SE EJECUTA SIEMPRE, HAYA ERROR DE JSON O NO.
            // Si la base de datos ya aniquiló el registro, esto garantiza tu expulsión.
            setUserData(null);
            openCloseModal();
            logout();
            navigate("/admin/"); // Limpia la URL
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
