import os
import uuid
from urllib.parse import urlparse
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from django.core.files.storage import FileSystemStorage
from pymongo.errors import DuplicateKeyError
from db import db

from .serializers import CategoriaSerializer


def guardar_imagen(archivo):
    """Guarda el archivo con nombre aleatorio y devuelve su ruta relativa (/uploads/...)."""
    fs = FileSystemStorage()
    extension = os.path.splitext(archivo.name)[1].lower()
    nombre_archivo = fs.save(f"{uuid.uuid4().hex}{extension}", archivo)
    return fs.url(nombre_archivo)


def borrar_imagen(url):
    """Elimina del disco la imagen referida por una URL absoluta o relativa."""
    if not url:
        return
    nombre_archivo = os.path.basename(urlparse(url).path)
    fs = FileSystemStorage()
    if nombre_archivo and fs.exists(nombre_archivo):
        fs.delete(nombre_archivo)


def error(mensaje, codigo=status.HTTP_400_BAD_REQUEST):
    return Response({"error": mensaje}, status=codigo)


class CategoriaViewSet(viewsets.GenericViewSet):
    lookup_field = 'id_categoria'
    serializer_class = CategoriaSerializer

    @property
    def coleccion(self):
        return db["Categoria"]

    def get_permissions(self):
        """
        Lectura pública para alimentar el catálogo;
        escritura restringida a administradores con token JWT.
        """
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    # ------------------------------------------------------------------ #
    # Utilidades internas
    # ------------------------------------------------------------------ #
    def responder(self, documento, codigo=status.HTTP_200_OK):
        return Response(self.get_serializer(documento).data, status=codigo)

    def ficha_ocupada(self, ficha, excluir_id=None):
        consulta = {"ficha": ficha}
        if excluir_id:
            consulta["id_categoria"] = {"$ne": excluir_id}
        return self.coleccion.find_one(consulta) is not None

    def validar_padres(self, padres, ficha_propia=None, ficha_anterior=None):
        """
        Devuelve un mensaje de error si algún padre no existe o si la asignación
        crearía un ciclo (que la categoría termine siendo ancestro de sí misma).
        """
        if not padres:
            return None

        existentes = {
            c["ficha"]: c.get("padres", [])
            for c in self.coleccion.find({}, {"ficha": 1, "padres": 1})
        }
        faltantes = [p for p in padres if p not in existentes]
        if faltantes:
            return f"Las categorías padre no existen: {', '.join(faltantes)}."

        propias = {f for f in (ficha_propia, ficha_anterior) if f}
        if not propias:
            return None

        # Recorrido hacia arriba desde cada padre propuesto
        pendientes, visitadas = list(padres), set()
        while pendientes:
            actual = pendientes.pop()
            if actual in propias:
                return "La jerarquía resultante tendría un ciclo: una categoría no puede ser ancestro de sí misma."
            if actual in visitadas:
                continue
            visitadas.add(actual)
            pendientes.extend(existentes.get(actual, []))
        return None

    def propagar_cambio_de_ficha(self, ficha_anterior, ficha_nueva):
        """Mantiene las referencias de las categorías hijas cuando un padre cambia de ficha."""
        if not (ficha_anterior and ficha_nueva) or ficha_anterior == ficha_nueva:
            return
        for hija in self.coleccion.find({"padres": ficha_anterior}):
            padres = [ficha_nueva if p == ficha_anterior else p for p in hija["padres"]]
            self.coleccion.update_one(
                {"id_categoria": hija["id_categoria"]}, {"$set": {"padres": padres}}
            )

    # ------------------------------------------------------------------ #
    # Lectura
    # ------------------------------------------------------------------ #
    # GET /api/categorias/
    def list(self, request):
        categorias = list(self.coleccion.find({}, {"_id": 0}))
        serializer = self.get_serializer(categorias, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # GET /api/categorias/{id_categoria}/
    def retrieve(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria}, {"_id": 0})
        if not categoria:
            return error("La categoría solicitada no existe.", status.HTTP_404_NOT_FOUND)
        return self.responder(categoria)

    # ------------------------------------------------------------------ #
    # Escritura
    # ------------------------------------------------------------------ #
    # POST /api/categorias/
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)

        if self.ficha_ocupada(datos["ficha"]):
            return error(f"Ya existe una categoría registrada con la ficha '{datos['ficha']}'.")

        mensaje = self.validar_padres(datos.get("padres"))
        if mensaje:
            return error(mensaje)

        archivo = datos.pop("imagen_portada", None)
        datos["imagen_portada"] = guardar_imagen(archivo) if archivo else None
        datos.setdefault("descripcion", "")
        datos["id_categoria"] = str(uuid.uuid4())

        try:
            self.coleccion.insert_one(datos)
        except DuplicateKeyError:
            borrar_imagen(datos["imagen_portada"])
            return error(f"Ya existe una categoría registrada con la ficha '{datos['ficha']}'.")

        datos.pop("_id", None)
        return self.responder(datos, status.HTTP_201_CREATED)

    # PUT /api/categorias/{id_categoria}/
    def update(self, request, id_categoria=None):
        """
        Reemplazo completo de nombre, descripción y padres.
        Si no se envía una imagen nueva se conserva la actual.
        """
        return self.actualizar(request, id_categoria, parcial=False)

    # PATCH /api/categorias/{id_categoria}/
    def partial_update(self, request, id_categoria=None):
        """Solo modifica los campos enviados."""
        return self.actualizar(request, id_categoria, parcial=True)

    def actualizar(self, request, id_categoria, parcial):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        if not categoria:
            return error("La categoría solicitada no existe.", status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data, partial=parcial)
        serializer.is_valid(raise_exception=True)
        cambios = dict(serializer.validated_data)
        cambios.pop("id_categoria", None)

        if not parcial:
            cambios.setdefault("descripcion", "")

        ficha_nueva = cambios.get("ficha", categoria["ficha"])
        if "ficha" in cambios and self.ficha_ocupada(ficha_nueva, excluir_id=id_categoria):
            return error(f"Ya existe una categoría registrada con la ficha '{ficha_nueva}'.")

        if "padres" in cambios:
            mensaje = self.validar_padres(
                cambios["padres"], ficha_propia=ficha_nueva, ficha_anterior=categoria["ficha"]
            )
            if mensaje:
                return error(mensaje)

        archivo = cambios.pop("imagen_portada", None)
        imagen_anterior = categoria.get("imagen_portada")
        if archivo:
            cambios["imagen_portada"] = guardar_imagen(archivo)

        try:
            if cambios:
                self.coleccion.update_one({"id_categoria": id_categoria}, {"$set": cambios})
        except DuplicateKeyError:
            if archivo:
                borrar_imagen(cambios["imagen_portada"])
            return error(f"Ya existe una categoría registrada con la ficha '{ficha_nueva}'.")

        # La imagen anterior solo se borra una vez que la nueva quedó registrada
        if archivo:
            borrar_imagen(imagen_anterior)
        self.propagar_cambio_de_ficha(categoria["ficha"], ficha_nueva)

        actualizada = self.coleccion.find_one({"id_categoria": id_categoria}, {"_id": 0})
        return self.responder(actualizada)

    # DELETE /api/categorias/{id_categoria}/
    def destroy(self, request, id_categoria=None):
        categoria = self.coleccion.find_one({"id_categoria": id_categoria})
        if not categoria:
            return error("La categoría solicitada no existe.", status.HTTP_404_NOT_FOUND)

        if db["Nota"].find_one({"id_categoria": id_categoria}):
            return error("No se puede eliminar una categoría con notas asociadas.")

        if self.coleccion.find_one({"padres": categoria["ficha"]}):
            return error("No se puede eliminar una categoría padre. Elimina o reasigna primero sus subcategorías.")

        self.coleccion.delete_one({"id_categoria": id_categoria})
        borrar_imagen(categoria.get("imagen_portada"))

        return Response(status=status.HTTP_204_NO_CONTENT)
