import React, { useState } from "react";
import { Button, Form, Message } from "semantic-ui-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import "./EditProfileForm.scss";

export function EditProfileForm({ user, onClose, onRefetch, updateUser }) {
  const [errorState, setErrorState] = useState(null);

  const formik = useFormik({
    initialValues: {
      email: user?.email || "",
      username: user?.username || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
    },
    validationSchema: Yup.object({
      email: Yup.string().email("Correo inválido").required("Requerido"),
      username: Yup.string()
        .required("Requerido")
        .matches(/^[a-zA-Z0-9_@+-.]+$/, "Sin espacios ni caracteres extraños"),
      first_name: Yup.string().required("Requerido"),
      last_name: Yup.string().required("Requerido"),
    }),
    onSubmit: async (formValues) => {
      try {
        await updateUser(user.id, formValues);
        onRefetch();
        onClose();
      } catch (error) {
        setErrorState(error.message || "Error al actualizar perfil");
      }
    },
  });

  return (
    <Form onSubmit={formik.handleSubmit}>
      <Form.Input
        name="username"
        value={formik.values.username}
        onChange={formik.handleChange}
        error={formik.errors.username}
      />
      <Form.Input
        name="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        error={formik.errors.email}
      />
      <Form.Input
        name="first_name"
        value={formik.values.first_name}
        onChange={formik.handleChange}
        error={formik.errors.first_name}
      />
      <Form.Input
        name="last_name"
        value={formik.values.last_name}
        onChange={formik.handleChange}
        error={formik.errors.last_name}
      />
      {errorState && (
        <Message negative size="small" className="edit-profile-form__error-msg">
          {errorState}
        </Message>
      )}
      <Button type="submit" primary fluid content="Guardar cambios" />
    </Form>
  );
}
