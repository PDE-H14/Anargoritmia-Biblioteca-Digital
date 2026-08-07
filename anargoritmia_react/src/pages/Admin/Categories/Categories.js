import React, { useEffect, useState } from "react";
import { Loader } from "semantic-ui-react";

import { HeaderPage, CategoriesTable } from "../../../components/Admin";
import { useCategory, useAuth } from "../../../hooks";

export function Categories() {
  const [refetch, setRefetch] = useState(false);
  const { loading, error, categories, getCategories } = useCategory();
  const { auth } = useAuth();

  const onRefetch = () => setRefetch((prev) => !prev);

  useEffect(() => {
    getCategories();
  }, [refetch]);

  const headerActions = [
    {
      label: "Nueva categoría",
      action: console.log("nueva categoría"),
      variant: "success",
      icon: "plus",
    },
  ];

  console.log(categories);
  return (
    <div>
      <HeaderPage
        className="categories-admin-header"
        title="Categorías"
        btnActions={headerActions}
      />
      {loading ? (
        <Loader active inline="centered">
          Cargando
        </Loader>
      ) : (
        <CategoriesTable categories={categories} />
      )}
    </div>
  );
}
