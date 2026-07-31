import React from "react";
import { Table, Button, Icon } from "semantic-ui-react";
import { map } from "lodash";

import "./UsersTable.scss";

export function UsersTable(props) {
  const { users } = props;
  return (
    <Table className="users-table-admin">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Nombre de usuario</Table.HeaderCell>
          <Table.HeaderCell>email</Table.HeaderCell>
          <Table.HeaderCell>Nombre</Table.HeaderCell>
          <Table.HeaderCell>Apellidos</Table.HeaderCell>
          <Table.HeaderCell>Activo</Table.HeaderCell>
          <Table.HeaderCell>Staff</Table.HeaderCell>
          <Table.HeaderCell>Acciones</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {map(users, (user, index) => (
          <Table.Row key={index}>
            <Table.Cell>{user.username}</Table.Cell>
            <Table.Cell>{user.email}</Table.Cell>
            <Table.Cell>{user.first_name}</Table.Cell>
            <Table.Cell>{user.last_name}</Table.Cell>
            <Table.Cell className="status">
              {user.is_active ? (
                <Icon name="check" positive />
              ) : (
                <Icon name="close" negative />
              )}
            </Table.Cell>
            <Table.Cell className="status">
              {user.is_staff ? (
                <Icon name="check" positive />
              ) : (
                <Icon name="close" negative />
              )}
            </Table.Cell>
            <Actions user={user} />
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function Actions(props) {
  const { user } = props;
  return (
    <Table.Cell textAlign="right">
      <Button icon onClick={() => console.log("Editar:", user)}>
        <Icon name="pencil" />
      </Button>
      <Button icon negative onClick={() => console.log("Editar:", user)}>
        <Icon name="trash alternate" />
      </Button>
    </Table.Cell>
  );
}
