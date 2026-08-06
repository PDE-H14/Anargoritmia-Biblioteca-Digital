import React from "react";

import { HeaderPage } from "../../../components/Admin/HeaderPage";

export function Categories() {
  const headerActions = [
    {
      label: "Nueva categoría",
      action: console.log("nueva categoría"),
      variant: "success",
      icon: "plus",
    },
  ];
  return (
    <div>
      <HeaderPage
        className="categories-admin-header"
        title="Categorías"
        btnActions={headerActions}
      />
    </div>
  );
}
