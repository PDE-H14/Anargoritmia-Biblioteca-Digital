import React from "react";

import { useAuth } from "../../hooks";

export function Home() {
  const { auth, logout } = useAuth();
  return (
    <div>
      HomeCli
      <button className="top-menu-admin__logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
