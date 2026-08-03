import uuid
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from db import db
from .serializers import CategoriaSerializer

class CategoriaViewSet(viewsets.ViewSet):
    coleccion = db["Categoria"]
    lookup_field = "id_categoria"  # Permite que la URL capture id_categoria como parámetro

    def get_permissions(self):
        """
        Lectura pública para alimentar el catálogo;
        escritura restringida a administradores con token JWT.
        """
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    # Lectura (GET /api/categorias/)
    def list(self, request):
        categorias_mongo = list(self.coleccion.find({}))
        for categoria in categorias_mongo:
            categoria["_id"] = str(categoria["_id"])
        return Response(categorias_mongo, status=status.HTTP_200_OK)

    # Lectura individual (GET /api/categorias/{id_categoria}/)
    def retrieve(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        if categoria:
            categoria["_id"] = str(categoria["_id"])
            return Response(categoria, status=status.HTTP_200_OK)

        return Response(
            {"error": "La categoría solicitada no existe."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Creación (POST /api/categorias/)
    def create(self, request):
        serializer = CategoriaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        datos = serializer.validated_data
        datos["id_categoria"] = str(uuid.uuid4())

        self.coleccion.insert_one(datos)
        datos["_id"] = str(datos["_id"])
        return Response(datos, status=status.HTTP_201_CREATED)

    # Actualización (PUT /api/categorias/{id_categoria}/)
    def update(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        if not categoria:
            return Response(
                {"error": "La categoría solicitada no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CategoriaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        datos = serializer.validated_data
        datos["id_categoria"] = id_categoria 

        self.coleccion.replace_one({"id_categoria": id_categoria}, datos)
        
        cat_actualizada = self.coleccion.find_one({"id_categoria": id_categoria})
        cat_actualizada["_id"] = str(cat_actualizada["_id"])
        return Response(cat_actualizada, status=status.HTTP_200_OK)

    # Actualización parcial (PATCH /api/categorias/{id_categoria}/)
    def partial_update(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        if not categoria:
            return Response(
                {"error": "La categoría solicitada no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CategoriaSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        cambios = serializer.validated_data
        cambios.pop("id_categoria", None)

        if cambios:
            self.coleccion.update_one(
                {"id_categoria": id_categoria},
                {"$set": cambios}
            )

        categoria_actualizada = self.coleccion.find_one({"id_categoria": id_categoria})
        categoria_actualizada["_id"] = str(categoria_actualizada["_id"])
        return Response(categoria_actualizada, status=status.HTTP_200_OK)

    # Eliminación (DELETE /api/categorias/{id_categoria}/)
    def destroy(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        if not categoria:
            return Response(
                {"error": "La categoría solicitada no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        if db["Nota"].find_one({"id_categoria": id_categoria}):
            return Response(
                {"error": "Integridad referencial: No se puede eliminar una categoría con notas asociadas."},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.coleccion.delete_one({"id_categoria": id_categoria})
        return Response(status=status.HTTP_204_NO_CONTENT)