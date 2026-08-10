import os
import uuid
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from django.core.files.storage import FileSystemStorage
from db import db

from .serializers import CategoriaSerializer

class CategoriaViewSet(viewsets.GenericViewSet):
    coleccion = db["Categoria"]
    lookup_field = 'id_categoria'
    serializer_class = CategoriaSerializer
    
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
            
        # Pasa los datos por el serializador con many=True
        serializer = self.get_serializer(categorias_mongo, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # Lectura individual (GET /api/categorias/{id_categoria}/)
    def retrieve(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        
        if categoria:
            categoria["_id"] = str(categoria["_id"])
            # Pasa el documento individual por el serializador
            serializer = self.get_serializer(categoria)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(
            {"error": "La categoría solicitada no existe."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Creación (POST /api/categorias/)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        datos_finales = serializer.validated_data
        
        archivo = datos_finales.get('imagen_portada')
        if archivo:
            fs = FileSystemStorage()
            extension = os.path.splitext(archivo.name)[1]
            nombre_seguro = f"{uuid.uuid4().hex}{extension}"
            filename = fs.save(nombre_seguro, archivo)
            url_relativa = fs.url(filename)
            datos_finales['imagen_portada'] = request.build_absolute_uri(url_relativa)

        if 'ficha' in datos_finales and self.coleccion.find_one({"ficha": datos_finales['ficha']}):
            if archivo: 
                fs.delete(filename) 
            return Response(
                {"error": f"Conflicto de entidad: Ya existe una categoría registrada con la ficha '{datos_finales['ficha']}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        datos_finales["id_categoria"] = str(uuid.uuid4())
        self.coleccion.insert_one(datos_finales)
        datos_finales["_id"] = str(datos_finales["_id"])
        
        return Response(datos_finales, status=status.HTTP_201_CREATED)

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