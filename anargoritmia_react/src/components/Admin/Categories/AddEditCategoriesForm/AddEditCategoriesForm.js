import React, { useState, useCallback } from "react";
import { Form, Button, Image, Message } from "semantic-ui-react";
import { useDropzone } from "react-dropzone";
import { useFormik } from "formik";
import { map } from "lodash";
import * as Yup from "yup";

import "./AddEditCategories.scss";
import { useCategory } from "../../../../hooks";

export function AddEditCategoriesForm(props) {
  const { onClose, onRefetch, categories, category } = props;
  const { addCategory, updateCategory } = useCategory();

  const [errorState, setErrorState] = useState(null);
  const [previewImage, setPreviewImage] = useState(
    category?.imagen_portada || null,
  );

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

        if (category && typeof dataToSend.imagen_portada === "string") {
          delete dataToSend.imagen_portada;
        }

        if (category) {
          await updateCategory(category.id_categoria, dataToSend);
        } else {
          await addCategory(dataToSend);
        }

        onRefetch();
        onClose();
      } catch (error) {
        setErrorState(error.message || "Datos inadecuados");
      }
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) {
        formik.setFieldError(
          "imagen_portada",
          "El archivo debe ser una imagen JPG o PNG.",
        );
        return;
      }

      const file = acceptedFiles[0];
      setPreviewImage(URL.createObjectURL(file));
      formik.setFieldValue("imagen_portada", file);
    },
    [formik],
  );

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    noKeyboard: true,
    multiple: false,
    onDrop,
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

      <Button
        type="button"
        secondary
        fluid
        {...getRootProps()}
        color={formik.errors.imagen_portada ? "red" : null}
        content={previewImage ? "Cambiar imagen" : "Subir imagen de portada"}
      />
      <input {...getInputProps()} />

      {formik.errors.imagen_portada && (
        <Message negative size="mini">
          {formik.errors.imagen_portada}
        </Message>
      )}

      <Image src={previewImage} fluid />

      {errorState && (
        <Message negative size="small">
          {errorState}
        </Message>
      )}

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
    imagen_portada: Yup.mixed().required("La imagen es requerida"),
  };
}

function updateSchema() {
  return {
    nombre: Yup.string().required("El nombre es requerido"),
    descripcion: Yup.string().required("La descripción es requerida"),
    padres: Yup.array(),
    imagen_portada: Yup.mixed(),
  };
}
