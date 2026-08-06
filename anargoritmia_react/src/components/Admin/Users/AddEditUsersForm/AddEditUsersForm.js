import React from "react";
import { Form, Button, Checkbox } from "semantic-ui-react";
import { useFormik } from "formik";
import * as Yup from "yup";

import "./AddEditUsersForm.scss";
import { useUser } from "../../../../hooks";

export function AddEditUsersForm(props) {
  const { onClose, onRefetch, user } = props;

  const { createUser, updateUser } = useUser();

  const formik = useFormik({
    initialValues: initialValues(user),
    validationSchema: Yup.object(user ? updateSchema() : newSchema()),
    validateOnChange: false,
    onSubmit: async (formValues) => {
      try {
        const dataToSend = { ...formValues };

        if (!dataToSend.password) {
          delete dataToSend.password;
        }
        if (user) await updateUser(user.id, dataToSend);
        else await createUser(formValues);
        onRefetch();
        onClose();
      } catch (error) {
        throw error;
      }
    },
  });

  return (
    <Form className="add-edit-users-admin" onSubmit={formik.handleSubmit}>
      <Form.Input
        name="email"
        placeholder="Correo electrónico"
        value={formik.values.email}
        onChange={formik.handleChange}
        error={formik.errors.email}
      />
      <Form.Input
        name="username"
        placeholder="Nombre de usuario"
        value={formik.values.username}
        onChange={formik.handleChange}
        error={formik.errors.username}
      />
      <Form.Input
        name="first_name"
        placeholder="Nombres"
        value={formik.values.first_name}
        onChange={formik.handleChange}
        error={formik.errors.first_name}
      />
      <Form.Input
        name="last_name"
        placeholder="Apellidos"
        value={formik.values.last_name}
        onChange={formik.handleChange}
        error={formik.errors.last_name}
      />
      <Form.Input
        name="password"
        type="password"
        placeholder="Contraseña"
        value={formik.values.password}
        onChange={formik.handleChange}
        error={formik.errors.password}
      />
      <div className="add-edit-users-admin__active">
        <Checkbox
          toggle
          label="Usuario activo"
          checked={formik.values.is_active}
          onChange={(_, data) => {
            formik.setFieldValue("is_active", data.checked);
          }}
        />
      </div>
      <div className="add-edit-users-admin__staff">
        <Checkbox
          toggle
          label="Usuario administrador"
          checked={formik.values.is_staff}
          onChange={(_, data) => {
            formik.setFieldValue("is_staff", data.checked);
          }}
        />
      </div>
      <Button
        className="add-edit-users-admin__submit"
        type="submit"
        content={user ? "Actualizar" : "Crear"}
        primary
        fluid
      />
    </Form>
  );
}
function initialValues(user) {
  return {
    email: user?.email || "",
    username: user?.username || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    password: "",
    is_active: user?.is_active ? true : false,
    is_staff: user?.is_staff ? true : false,
  };
}
function newSchema() {
  return {
    email: Yup.string().email("Correo inválido").required("Requerido"),
    username: Yup.string()
      .required("Requerido")
      .matches(
        /^[a-zA-Z0-9_@+-.]+$/,
        "No se admiten espacios ni caracteres especiales ajenos a: _ @ + - .",
      ),
    first_name: Yup.string().required("Requerido"),
    last_name: Yup.string().required("Requerido"),
    password: Yup.string().required("Requerido"),
    is_active: Yup.boolean().required("Requerido"),
    is_staff: Yup.boolean().required("Requerido"),
  };
}

function updateSchema() {
  return {
    email: Yup.string().email("Correo inválido").required("Requerido"),
    username: Yup.string()
      .required("Requerido")
      .matches(
        /^[a-zA-Z0-9_@+-.]+$/,
        "No se admiten espacios ni caracteres especiales ajenos a: _ @ + - .",
      ),
    first_name: Yup.string(),
    last_name: Yup.string(),
    password: Yup.string(),
    is_active: Yup.boolean().required("Requerido"),
    is_staff: Yup.boolean().required("Requerido"),
  };
}
