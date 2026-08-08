import React, { useEffect, useState } from "react";
import { Loader } from "semantic-ui-react";

import {
  HeaderPage,
  CategoriesTable,
  AddEditCategoriesForm,
} from "../../../components/Admin";
import { BasicModal } from "../../../components/Common";
import { useCategory, useAuth } from "../../../hooks";

export function Categories() {
  const [showModal, setShowModal] = useState(false);
  const [titleModal, setTitleModal] = useState(null);
  const [contentModal, setContentModal] = useState(null);
  const [refetch, setRefetch] = useState(false);
  const { loading, error, categories, getCategories } = useCategory();
  const { auth } = useAuth();

  const openCloseModal = () => setShowModal((prev) => !prev);
  const onRefetch = () => setRefetch((prev) => !prev);

  const addCategory = () => {
    setTitleModal("Nueva categoría");
    setContentModal(
      <AddEditCategoriesForm
        onClose={openCloseModal}
        onRefetch={onRefetch}
        categories={categories}
      />,
    );
    openCloseModal();
  };

  useEffect(() => {
    getCategories();
  }, [refetch]);

  const headerActions = [
    {
      label: "Nueva categoría",
      action: addCategory,
      variant: "success",
      icon: "plus",
    },
  ];

  return (
    <div>
      <HeaderPage
        className="categories-admin-header"
        title="Categorías"
        btnActions={headerActions}
      />
      {loading ? (
        <Loader active inline="centered">
          Cargando
        </Loader>
      ) : (
        <CategoriesTable categories={categories} />
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
