import React from "react";
import { Table, Button, Icon } from "semantic-ui-react";
import { map } from "lodash";
import "./UsersTable.scss";

export function UsersTable(props) {
  const { users, updateUser, onDeleteUser } = props;

  return (
    <Table className="users-table-admin">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Nombre de usuario</Table.HeaderCell>
          <Table.HeaderCell>Correo</Table.HeaderCell>
          <Table.HeaderCell>Nombre</Table.HeaderCell>
          <Table.HeaderCell>Apellidos</Table.HeaderCell>
          <Table.HeaderCell textAlign="center">Activo</Table.HeaderCell>
          <Table.HeaderCell textAlign="center">Staff</Table.HeaderCell>
          <Table.HeaderCell textAlign="center">Acciones</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {map(users, (user) => (
          <Table.Row key={user.id}>
            <Table.Cell>{user.username}</Table.Cell>
            <Table.Cell>{user.email}</Table.Cell>
            <Table.Cell>{user.first_name}</Table.Cell>
            <Table.Cell>{user.last_name}</Table.Cell>

            <Table.Cell textAlign="center" className="status">
              {user.is_active ? (
                <Icon name="check" className="check" />
              ) : (
                <Icon name="close" className="close" />
              )}
            </Table.Cell>

            <Table.Cell textAlign="center" className="status">
              {user.is_staff ? (
                <Icon name="check" className="check" />
              ) : (
                <Icon name="close" className="close" />
              )}
            </Table.Cell>

            <Actions
              user={user}
              updateUser={updateUser}
              onDeleteUser={onDeleteUser}
            />
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function Actions(props) {
  const { user, updateUser, onDeleteUser } = props;
  return (
    <Table.Cell textAlign="center">
      <Button className="edit" icon onClick={() => updateUser(user)}>
        <Icon name="pencil" />
      </Button>
      <Button className="delete" icon onClick={() => onDeleteUser(user)}>
        <Icon name="trash alternate" />
      </Button>
    </Table.Cell>
  );
}
