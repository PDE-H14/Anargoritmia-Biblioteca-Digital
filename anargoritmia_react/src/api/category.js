import { apiFetch } from "./http";

function toFormData(data) {
  const formData = new FormData();
  formData.append("nombre", data.nombre);
  formData.append("descripcion", data.descripcion || "");

  // Solo se envía la imagen cuando el usuario eligió un archivo nuevo;
  // si no, el backend conserva la actual.
  if (data.imagen_portada instanceof File) {
    formData.append("imagen_portada", data.imagen_portada);
  }

  (data.padres || []).forEach((padre) => formData.append("padres", padre));
  return formData;
}

export function getCategoriesApi() {
  return apiFetch("/api/categorias/");
}

export function addCategoryApi(data, token) {
  return apiFetch("/api/categorias/", {
    method: "POST",
    token,
    body: toFormData(data),
  });
}

// PUT: reemplaza nombre, descripción y padres (una lista vacía los elimina).
export function updateCategoryApi(id_categoria, data, token) {
  return apiFetch(`/api/categorias/${id_categoria}/`, {
    method: "PUT",
    token,
    body: toFormData(data),
  });
}

export function deleteCategoryApi(id_categoria, token) {
  return apiFetch(`/api/categorias/${id_categoria}/`, {
    method: "DELETE",
    token,
  });
}
