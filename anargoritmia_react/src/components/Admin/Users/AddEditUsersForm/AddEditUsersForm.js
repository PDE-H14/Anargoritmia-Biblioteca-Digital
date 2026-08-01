import React from "react";
import { Form, Button, Checkbox } from "semantic-ui-react";

import "./AddEditUsersForm.scss";

export function AddEditUsersForm() {
  return (
    <Form className="add-edit-users-admin">
      <Form.Input name="email" placeholder="Correo electrónico" />
      <Form.Input name="username" placeholder="Nombre de usuario" />
      <Form.Input name="first_name" placeholder="Nombres" />
      <Form.Input name="last_name" placeholder="Apellidos" />
      <Form.Input name="password" type="password" placeholder="Contraseña" />
      <div className="add-edit-users-admin__active">
        <Checkbox toggle label="Usuario activo" />
      </div>
      <div className="add-edit-users-admin__staff">
        <Checkbox toggle label="Usuario administrador" />
      </div>
      <Button
        className="add-edit-users-admin__submit"
        type="submit"
        content="crear"
        primary
        fluid
      />
    </Form>
  );
}
