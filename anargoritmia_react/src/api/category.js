import { BASE_API } from "../utils/constants";

export async function getCategoriesApi(token) {
  try {
    const url = `${BASE_API}/api/categorias/`;
    /*const params = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };*/
    const response = await fetch(url); /*, params);*/
    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

export async function addCategoryApi(data, token) {
  try {
    const formData = new FormData();
    formData.append("imagen_portada", data.imagen_portada);
    formData.append("nombre", data.nombre);
    formData.append("descripcion", data.descripcion);

    if (data.padres && data.padres.length > 0) {
      data.padres.forEach((padre) => {
        formData.append("padres", padre);
      });
    }

    const url = `${BASE_API}/api/categorias/`;
    const params = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(url, params);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

export async function updateCategoryApi(id_categoria, data, token) {
  try {
    const formData = new FormData();
    formData.append("imagen_portada", data.imagen_portada);
    formData.append("nombre", data.nombre);
    formData.append("descripcion", data.descripcion);

    if (data.padres && data.padres.length > 0) {
      data.padres.forEach((padre) => {
        formData.append("padres", padre);
      });
    }
    const url = `${BASE_API}/api/categorias/${id_categoria}/`;
    const params = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(url, params);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

export async function deleteCategoryApi(id_categoria, token) {
  try {
    const url = `${BASE_API}/api/categorias/${id_categoria}/`;
    const params = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const response = await fetch(url, params);
    if (response.status !== 200) {
      throw new Error("Error al eliminar categoría");
    }
    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}
