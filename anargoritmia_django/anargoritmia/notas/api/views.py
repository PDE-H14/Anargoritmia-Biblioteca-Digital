import uuid
from datetime import datetime, timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from pymongo.errors import DuplicateKeyError
from db import db
from .serializers import NotaSerializer, generar_ficha

LICENCIA = "CC BY-SA 4.0"
MENSAJE_DUPLICADO = "Ya existe un documento de este autor con este título."


def ahora():
    """Fecha actual en UTC truncada a milisegundos, la precisión que guarda MongoDB."""
    fecha = datetime.now(timezone.utc)
    return fecha.replace(microsecond=fecha.microsecond // 1000 * 1000)


def error(mensaje, codigo=status.HTTP_400_BAD_REQUEST):
    return Response({"error": mensaje}, status=codigo)


def puede_editar(nota, usuario):
    """Solo el autor original o un administrador modifican una nota."""
    return usuario.is_authenticated and (
        nota['autor']['id_usuario'] == str(usuario.id) or usuario.is_staff
    )


def calcular_ficha(titulo, id_documento):
    """Ficha para URLs; los borradores sin título reciben una provisional única."""
    return generar_ficha(titulo or "") or f"sin-titulo-{id_documento[:8]}"


def texto_publico(bloques):
    """
    Texto plano de los bloques de texto públicos. Se guarda en `contenido`
    para búsquedas y vistas previas (y para cumplir el validador de Atlas).
    """
    return "\n\n".join(
        b.get("contenido", "") for b in bloques
        if b.get("tipo") == "texto" and b.get("publico")
    )


def version_publica(nota):
    """Copia de la nota con solo sus bloques públicos: lo que ve un lector."""
    return {**nota, "bloques": [b for b in nota.get("bloques", []) if b.get("publico")]}


class NotaViewSet(viewsets.GenericViewSet):
    lookup_field = 'id_documento'
    serializer_class = NotaSerializer

    @property
    def coleccion(self):
        return db['Nota']

    def get_permissions(self):
        """
        Lectura pública para notas publicadas;
        escritura restringida a usuarios autenticados vía JWT.
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def serializar(self, documento, codigo=status.HTTP_200_OK):
        return Response(NotaSerializer(documento).data, status=codigo)

    def serializer_de_edicion(self, nota, data, parcial):
        contexto = self.get_serializer_context()
        contexto['nota'] = nota
        contexto['id_autor'] = nota['autor']['id_usuario']
        contexto['id_documento'] = nota['id_documento']
        return NotaSerializer(data=data, partial=parcial, context=contexto)

    @staticmethod
    def completar_derivados(datos, id_documento):
        """Campos que el servidor calcula a partir de lo editable."""
        if 'titulo' in datos:
            datos['ficha'] = calcular_ficha(datos['titulo'], id_documento)
        if 'bloques' in datos:
            datos['bloques'] = [dict(b) for b in datos['bloques']]
            datos['contenido'] = texto_publico(datos['bloques'])
        datos['fecha_modificacion'] = ahora()
        return datos

    # ------------------------------------------------------------------ #
    # Lectura
    # ------------------------------------------------------------------ #
    def list(self, request):
        """
        Consulta pública: solo notas publicadas y solo sus bloques públicos.
        Filtro opcional: ?categoria=<id_categoria>
        """
        query = {"es_borrador": False}
        id_categoria = request.query_params.get('categoria')
        if id_categoria:
            query["id_categoria"] = id_categoria

        notas = self.coleccion.find(query, {"_id": 0}).sort("fecha_publicacion", -1)
        return Response(
            NotaSerializer([version_publica(n) for n in notas], many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def mias(self, request):
        """
        GET /api/notas/mias/: todas las notas del usuario autenticado,
        incluidos borradores y bloques privados, de la más reciente a la más antigua.
        """
        notas = self.coleccion.find(
            {"autor.id_usuario": str(request.user.id)}, {"_id": 0}
        ).sort("fecha_modificacion", -1)
        return Response(NotaSerializer(list(notas), many=True).data, status=status.HTTP_200_OK)

    def retrieve(self, request, id_documento=None):
        """
        - Autor o administrador: la nota completa (borradores y bloques privados),
          salvo que pida ?vista=publica para previsualizar lo que ve un lector.
        - Cualquier otra persona: solo notas publicadas y solo sus bloques públicos.
        """
        nota = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0})
        if nota:
            if puede_editar(nota, request.user):
                # El autor puede previsualizar incluso un borrador como lo vería un lector
                if request.query_params.get('vista') == 'publica':
                    return self.serializar(version_publica(nota))
                return self.serializar(nota)
            if not nota.get('es_borrador'):
                return self.serializar(version_publica(nota))

        return error("El documento no existe o se encuentra en estado de borrador.",
                     status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------ #
    # Escritura
    # ------------------------------------------------------------------ #
    def create(self, request):
        """
        Requiere JWT. El servidor fija identificador, autor, ficha y licencia.
        Una nota nueva puede crearse vacía (borrador) para el autoguardado.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)

        datos['id_documento'] = str(uuid.uuid4())
        datos['licencia'] = LICENCIA
        datos['autor'] = {
            "id_usuario": str(request.user.id),
            "alias": request.user.username,
            "correo": request.user.email,
        }
        self.completar_derivados(datos, datos['id_documento'])
        datos['fecha_publicacion'] = None if datos['es_borrador'] else datos['fecha_modificacion']

        try:
            self.coleccion.insert_one(datos)
        except DuplicateKeyError:
            return error(MENSAJE_DUPLICADO)

        datos.pop('_id', None)
        return self.serializar(datos, status.HTTP_201_CREATED)

    def update(self, request, id_documento=None):
        """Actualización completa (PUT)."""
        return self.actualizar(request, id_documento, parcial=False)

    def partial_update(self, request, id_documento=None):
        """Actualización parcial (PATCH): lo que usa el autoguardado."""
        return self.actualizar(request, id_documento, parcial=True)

    def actualizar(self, request, id_documento, parcial):
        nota = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0})
        if not nota:
            return error("El documento no existe.", status.HTTP_404_NOT_FOUND)
        if not puede_editar(nota, request.user):
            return error("Solo el autor original o un administrador pueden modificar este recurso.",
                         status.HTTP_403_FORBIDDEN)

        serializer = self.serializer_de_edicion(nota, request.data, parcial)
        serializer.is_valid(raise_exception=True)
        cambios = dict(serializer.validated_data)
        cambios['licencia'] = LICENCIA
        self.completar_derivados(cambios, id_documento)

        # La fecha de publicación se fija la primera vez que se publica y
        # se borra al regresar a borrador.
        if 'es_borrador' in cambios:
            if cambios['es_borrador']:
                cambios['fecha_publicacion'] = None
            elif not nota.get('fecha_publicacion'):
                cambios['fecha_publicacion'] = cambios['fecha_modificacion']

        try:
            self.coleccion.update_one({"id_documento": id_documento}, {"$set": cambios})
        except DuplicateKeyError:
            return error(MENSAJE_DUPLICADO)

        actualizada = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0})
        return self.serializar(actualizada)

    def destroy(self, request, id_documento=None):
        """Eliminación física (DELETE)."""
        nota = self.coleccion.find_one({"id_documento": id_documento})
        if not nota:
            return error("El documento no existe.", status.HTTP_404_NOT_FOUND)
        if not puede_editar(nota, request.user):
            return error("No tienes permisos para eliminar este recurso.", status.HTTP_403_FORBIDDEN)

        self.coleccion.delete_one({"id_documento": id_documento})
        return Response(status=status.HTTP_204_NO_CONTENT)
