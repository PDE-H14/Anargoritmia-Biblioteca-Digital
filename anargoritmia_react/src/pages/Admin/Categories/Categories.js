import React, { useEffect, useState } from "react";
import { Loader, Button } from "semantic-ui-react";

import {
  HeaderPage,
  CategoriesTable,
  AddEditCategoriesForm,
} from "../../../components/Admin";
import { BasicModal } from "../../../components/Common";
import { useCategory } from "../../../hooks";

export function Categories() {
  const [showModal, setShowModal] = useState(false);
  const [titleModal, setTitleModal] = useState(null);
  const [contentModal, setContentModal] = useState(null);
  const [refetch, setRefetch] = useState(false);
  const { loading, categories, getCategories, deleteCategory } = useCategory();

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

  const onUpdateCategory = (data) => {
    setTitleModal("Modificar categoría");
    setContentModal(
      <AddEditCategoriesForm
        onClose={openCloseModal}
        onRefetch={onRefetch}
        categories={categories}
        category={data}
      />,
    );
    openCloseModal();
  };

  // Eliminación de categoría
  const onDeleteCategory = (data) => {
    /* Verificamos si existe al menos una categoría en el estado global
     que incluya la ficha de la categoría actual dentro de su arreglo de "padres"*/
    const tieneHijos = categories.some(
      (cat) => cat.padres && cat.padres.includes(data.ficha),
    );

    if (tieneHijos) {
      setTitleModal("Operación bloqueada");
      setContentModal(
        <div className="categories-admin__delete-confirm">
          <p>
            No puedes eliminar categorías padre. Asegúrate de eliminar primero
            sus dependencias.
          </p>
          <Button onClick={openCloseModal} primary fluid>
            Aceptar
          </Button>
        </div>,
      );
      openCloseModal();
      return;
    }

    setTitleModal("Confirmar eliminación");
    setContentModal(
      <div className="categories-admin__delete-confirm">
        <p>
          ¿Estás seguro de que deseas eliminar la categoría{" "}
          <strong>{data.nombre}</strong>?
        </p>
        <p className="categories-admin__delete-confirm-details">
          Esta acción purgará de forma permanente el registro asociado a la
          ficha <code>{data.ficha}</code>. Esta operación no se puede revertir.
        </p>
        <div className="categories-admin__delete-confirm-actions">
          <Button onClick={openCloseModal} secondary fluid>
            Cancelar
          </Button>

          <Button
            onClick={async () => {
              try {
                await deleteCategory(data.id_categoria);
                openCloseModal();
                onRefetch();
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
  // Eliminación de categoría

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
        <CategoriesTable
          categories={categories}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
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
