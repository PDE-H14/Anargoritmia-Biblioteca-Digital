import uuid
from datetime import datetime, timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from pymongo.errors import DuplicateKeyError
from db import db
from .serializers import NotaSerializer

class NotaViewSet(viewsets.GenericViewSet):
    coleccion = db['Nota']
    lookup_field = 'id_documento'
    serializer_class = NotaSerializer

    def get_permissions(self):
        """
        Lectura pública para notas validadas; 
        escritura restringida a usuarios autenticados vía JWT.
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        """
        Consulta pública: Filtra exclusivamente notas publicadas (es_borrador = False).
        """
        query = {"es_borrador": False}
        
        # Filtro opcional por categoría si React lo envía en la URL (?categoria=ficha)
        categoria_ficha = request.query_params.get('categoria')
        if categoria_ficha:
            query["id_categoria"] = categoria_ficha

        notas_mongo = list(self.coleccion.find(query))

        for nota in notas_mongo:
            nota['_id'] = str(nota['_id'])

        serializer = self.get_serializer(notas_mongo, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, id_documento=None):
        """
        Recupera una nota específica mediante su id_documento agnóstico (UUID).
        """
        
        nota = self.coleccion.find_one({"id_documento": id_documento, "es_borrador": False})
        
        if nota:
            nota['_id'] = str(nota['_id'])

            serializer = self.get_serializer(nota)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        return Response(
            {"error": "El documento no existe o se encuentra en estado de borrador."}, 
            status=status.HTTP_404_NOT_FOUND
        )

    def create(self, request):
        """
        Inyección de conocimiento: Requiere JWT y fuerza los metadatos del servidor.
        """
        serializer = NotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        datos = serializer.validated_data

        datos['id_documento'] = str(uuid.uuid4())
        datos['licencia'] = "CC BY-SA 4.0"

        datos['autor'] = {
            "id_usuario": str(request.user.id),
            "alias": request.user.username,
            "correo": request.user.email
        }

        if not datos.get('es_borrador') and not datos.get('fecha_publicacion'):
            datos['fecha_publicacion'] = datetime.now(timezone.utc)

        try:
            self.coleccion.insert_one(datos)
        except DuplicateKeyError:
            return Response(
                {"error": "Conflicto de entidad: Ya tienes una nota registrada con este título o ficha."},
                status=status.HTTP_400_BAD_REQUEST
            )

        datos['_id'] = str(datos['_id'])
        return Response(datos, status=status.HTTP_201_CREATED)

    def update(self, request, id_documento=None):
        """
        Actualización completa (PUT). Requiere autenticación JWT.
        """
        nota = self.coleccion.find_one({"id_documento": id_documento})
        if not nota:
            return Response({"error": "El documento no existe."}, status=status.HTTP_404_NOT_FOUND)

        if nota['autor']['id_usuario'] != str(request.user.id):
            return Response({"error": "No tienes permisos de edición sobre este recurso."}, status=status.HTTP_403_FORBIDDEN)

        serializer = NotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        datos = serializer.validated_data
        
        datos['id_documento'] = id_documento
        datos['licencia'] = "CC BY-SA 4.0"
        datos['autor'] = nota['autor']  

        self.coleccion.replace_one({"id_documento": id_documento}, datos)
        
        datos['_id'] = str(nota['_id'])
        
        return Response(datos, status=status.HTTP_200_OK)

    def destroy(self, request, id_documento=None):
        """
        Eliminación física (DELETE).
        """
        nota = self.coleccion.find_one({"id_documento": id_documento})
        if not nota:
            return Response({"error": "El documento no existe."}, status=status.HTTP_404_NOT_FOUND)

        if nota['autor']['id_usuario'] != str(request.user.id) and not request.user.is_staff:
            return Response({"error": "No tienes permisos para eliminar este recurso."}, status=status.HTTP_403_FORBIDDEN)

        self.coleccion.delete_one({"id_documento": id_documento})
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, id_documento=None):
        """
        Actualización parcial (PATCH). Permite modificar campos individuales.
        """
        id_doc = id_documento  
        nota = self.coleccion.find_one({"id_documento": id_doc})
            
        if not nota:
            return Response(
                {"error": "El documento no existe en el repositorio."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        if nota['autor']['id_usuario'] != str(request.user.id) and not request.user.is_staff:
            return Response(
                {"error": "Acceso denegado: Solo el autor original o un administrador pueden modificar este recurso."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = NotaSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        cambios = serializer.validated_data

        cambios.pop('id_documento', None)  
        cambios.pop('autor', None)         
        cambios['licencia'] = "CC BY-SA 4.0" 

        if cambios.get('es_borrador') is False and nota.get('es_borrador') is True:
            if not nota.get('fecha_publicacion'):
                cambios['fecha_publicacion'] = datetime.now(timezone.utc)

        if cambios:
            self.coleccion.update_one(
                {"id_documento": id_doc},
                {"$set": cambios}
            )

        nota_actualizada = self.coleccion.find_one({"id_documento": id_doc})
        nota_actualizada['_id'] = str(nota_actualizada['_id'])

        return Response(nota_actualizada, status=status.HTTP_200_OK)