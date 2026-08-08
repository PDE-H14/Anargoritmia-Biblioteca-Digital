import React from "react";
import { Form, Button } from "semantic-ui-react";
import { useFormik } from "formik";
import { map } from "lodash";
import * as Yup from "yup";

import "./AddEditCategories.scss";
import { useCategory } from "../../../../hooks";

export function AddEditCategoriesForm(props) {
  const { onClose, onRefetch, categories, category } = props;
  const { createCategory, updateCategory } = useCategory();

  const formatDropdownData = (data) => {
    return map(data, (cat) => ({
      key: cat.id_categoria || cat.ficha,
      text: cat.nombre,
      value: cat.ficha,
    }));
  };

  const formik = useFormik({
    initialValues: initialValues(category),
    validationSchema: Yup.object(category ? updateSchema() : newSchema()),
    validateOnChange: false,
    onSubmit: async (formValues) => {
      try {
        const dataToSend = { ...formValues };
        if (category) {
          await updateCategory(category.id_categoria, dataToSend);
        } else {
          await createCategory(dataToSend);
        }
        onRefetch();
        onClose();
      } catch (error) {
        throw error;
      }
    },
  });

  return (
    <Form className="add-edit-categories-admin" onSubmit={formik.handleSubmit}>
      <Form.Input
        name="nombre"
        placeholder="Título de la categoría"
        value={formik.values.nombre}
        onChange={formik.handleChange}
        error={formik.errors.nombre}
      />
      <Form.TextArea
        name="descripcion"
        placeholder="Descripción"
        value={formik.values.descripcion}
        onChange={formik.handleChange}
        error={formik.errors.descripcion}
      />
      <Form.Select
        name="padres"
        placeholder="Dependencias"
        fluid
        multiple
        search
        selection
        options={formatDropdownData(categories)}
        value={formik.values.padres}
        onChange={(_, data) => formik.setFieldValue("padres", data.value)}
        error={formik.errors.padres}
        noResultsMessage="No hay más categorías disponibles"
      />
      <Form.Input
        name="imagen_portada"
        placeholder="URL de Portada"
        value={formik.values.imagen_portada}
        onChange={formik.handleChange}
        error={formik.errors.imagen_portada}
      />
      <Button
        className="add-edit-users-admin__submit"
        type="submit"
        content={category ? "Actualizar" : "Crear"}
        primary
        fluid
      />
    </Form>
  );
}

function initialValues(category) {
  return {
    nombre: category?.nombre || "",
    descripcion: category?.descripcion || "",
    padres: category?.padres || [],
    imagen_portada: category?.imagen_portada || "",
  };
}

function newSchema() {
  return {
    nombre: Yup.string().required("El nombre es requerido"),
    descripcion: Yup.string().required("La descripción es requerida"),
    padres: Yup.array(),
    imagen_portada: Yup.string(),
  };
}

function updateSchema() {
  return {
    nombre: Yup.string().required("El nombre es requerido"),
    descripcion: Yup.string().required("La descripción es requerida"),
    padres: Yup.array(),
    imagen_portada: Yup.string(),
  };
}
