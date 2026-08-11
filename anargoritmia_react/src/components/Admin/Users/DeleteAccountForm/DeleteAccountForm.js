import React, { useState } from "react";
import { Button, Form, Message } from "semantic-ui-react";
import { useFormik } from "formik";
import * as Yup from "yup";

export function DeleteAccountForm({ user, onClose, onDelete }) {
  const [errorState, setErrorState] = useState(null);

  const formik = useFormik({
    initialValues: {
      confirmEmail: "",
      confirmUsername: "",
      password: "",
    },
    validationSchema: Yup.object({
      confirmEmail: Yup.string()
        .oneOf([user.email], "El correo no coincide con tu cuenta activa")
        .required("Requerido"),
      confirmUsername: Yup.string()
        .oneOf([user.username], "El nombre de usuario no coincide")
        .required("Requerido"),
      password: Yup.string().required(
        "Contraseña obligatoria para validar identidad",
      ),
    }),
    onSubmit: async (formValues) => {
      try {
        // Aquí pasamos las credenciales al backend para validar la contraseña antes de borrar
        await onDelete(formValues.password);
      } catch (error) {
        setErrorState(error.message || "Credenciales incorrectas. Abortando.");
      }
    },
  });

  return (
    <Form onSubmit={formik.handleSubmit} className="delete-account-form">
      <Message warning>
        <Message.Header>Esta acción es definitiva y destructiva</Message.Header>
        <p>
          Para proceder, debes transcribir de forma exacta tus credenciales de
          acceso. Esto garantiza que eres el poseedor soberano de la cuenta.
        </p>
      </Message>

      <Form.Input
        name="confirmEmail"
        placeholder="Escribe tu correo electrónico para confirmar"
        value={formik.values.confirmEmail}
        onChange={formik.handleChange}
        error={formik.errors.confirmEmail}
        autoComplete="off"
      />
      <Form.Input
        name="confirmUsername"
        placeholder="Escribe tu nombre de usuario para confirmar"
        value={formik.values.confirmUsername}
        onChange={formik.handleChange}
        error={formik.errors.confirmUsername}
        autoComplete="off"
      />
      <Form.Input
        name="password"
        type="password"
        placeholder="Escribe tu contraseña para autorizar la purga"
        value={formik.values.password}
        onChange={formik.handleChange}
        error={formik.errors.password}
      />

      {errorState && <Message negative>{errorState}</Message>}

      <div className="delete-account-form__actions">
        <Button type="button" onClick={onClose} secondary fluid>
          Cancelar
        </Button>
        <Button type="submit" primary fluid>
          Confirmar destrucción
        </Button>
      </div>
    </Form>
  );
}
