import React, { useState } from "react";
import { Button, Form, Message } from "semantic-ui-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { loginApi } from "../../../api/user";
import { useAuth } from "../../../hooks";
import "./LoginForm.scss";

export function LoginForm() {
  const { login } = useAuth();
  const [errorState, setErrorState] = useState();
  const formik = useFormik({
    initialValues: initialValues(),
    validationSchema: Yup.object(validationSchema()),
    onSubmit: async (formValues) => {
      try {
        const response = await loginApi(formValues);
        const { access } = response;
        login(access);
        //console.log(access);
      } catch (error) {
        setErrorState(error.message || "Usuario o contraseña incorrectos");
      }
    },
  });
  return (
    <div className="login-form">
      <Form className="login-form-admin" onSubmit={formik.handleSubmit}>
        <Form.Input
          name="email"
          placeholder="Correo electrónico"
          value={formik.values.email}
          onChange={formik.handleChange}
          error={formik.errors.email}
        />
        <Form.Input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.errors.password}
        />
        {errorState && (
          <Message negative size="small" className="login-form__inline-error">
            {errorState}
          </Message>
        )}
        <Button type="submit" content="Entrar" primary fluid />
      </Form>
    </div>
  );
}
function initialValues() {
  return {
    email: "",
    password: "",
  };
}
function validationSchema() {
  return {
    email: Yup.string().email("Correo inválido").required("Requerido"),
    password: Yup.string().required("Requerido"),
  };
}
