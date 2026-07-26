import React from "react";
import { Button, Form } from "semantic-ui-react";
import "./LoginForm.scss";

export function LoginForm(props) {
  return (
    <div className="login-form">
      <Form className="login-form-admin">
        <Form.Input name="email" placeholder="Correo electrónico" />
        <Form.Input name="password" type="password" placeholder="Contraseña" />
        <Button type="submit" content="Iniciar sesión" primary fluid />
      </Form>
    </div>
  );
}
