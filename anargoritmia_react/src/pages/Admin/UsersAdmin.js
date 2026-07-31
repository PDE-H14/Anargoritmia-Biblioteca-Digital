import React, { useEffect } from "react";
import { Loader } from "semantic-ui-react";

import { HeaderPage, UsersTable } from "../../components/Admin";
import { useUser } from "../../hooks";

export function UsersAdmin() {
  const { loading, users, getUsers } = useUser();

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div>
      <HeaderPage title="Usuarios" button1="Nuevo usuario" action1={true} />
      {loading ? (
        <Loader active inline="centered">
          Cargando...
        </Loader>
      ) : (
        <>
          <UsersTable users={users} />
        </>
      )}
    </div>
  );
}
