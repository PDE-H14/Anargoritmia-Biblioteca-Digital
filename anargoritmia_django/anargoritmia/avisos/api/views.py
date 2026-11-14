import uuid
from datetime import datetime, timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from db import db
from .serializers import LUGARES, AvisoSerializer

# Orden en la banda: primero lo fijado y, dentro, lo más urgente
PRIORIDAD = {"importante": 0, "mantenimiento": 1, "novedad": 2, "reconocimiento": 3}
MAX_HISTORIAL = 100


def ahora():
    return datetime.now(timezone.utc)


def con_zona(fecha):
    # PyMongo devuelve fechas sin zona (en UTC)
    return fecha.replace(tzinfo=timezone.utc) if fecha and fecha.tzinfo is None else fecha


def vigente(aviso, momento):
    desde, hasta = con_zona(aviso.get("desde")), con_zona(aviso.get("hasta"))
    return (desde is None or desde <= momento) and (hasta is None or hasta > momento)


def orden_banda(aviso):
    desde = con_zona(aviso.get("desde")) or con_zona(aviso.get("creado"))
    return (not aviso.get("fijado"), PRIORIDAD.get(aviso.get("tipo"), 9), -desde.timestamp())


class AvisoViewSet(viewsets.GenericViewSet):
    """
    GET /api/avisos/?lugar=publico|taller: avisos vigentes, el primero es el
      que va en la banda (público).
    GET /api/avisos/historial/: lo ya publicado, del más reciente al más
      antiguo, para la página «Novedades» (público).
    GET /api/avisos/todos/, POST, PATCH y DELETE: solo administración.
    """
    lookup_field = "id_aviso"
    serializer_class = AvisoSerializer

    @property
    def coleccion(self):
        return db["Aviso"]

    def get_permissions(self):
        if self.action in ("list", "historial"):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def serializar(self, avisos, codigo=status.HTTP_200_OK, varios=True):
        return Response(AvisoSerializer(avisos, many=varios).data, status=codigo)

    def list(self, request):
        momento = ahora()
        lugar = request.query_params.get("lugar")
        filtro = {"lugares": lugar} if lugar in LUGARES else {}
        avisos = [a for a in self.coleccion.find(filtro, {"_id": 0}) if vigente(a, momento)]
        return self.serializar(sorted(avisos, key=orden_banda))

    @action(detail=False, methods=["get"])
    def historial(self, request):
        momento = ahora()
        avisos = [a for a in self.coleccion.find({}, {"_id": 0})
                  if con_zona(a.get("desde")) is None or con_zona(a.get("desde")) <= momento]
        avisos.sort(key=lambda a: (con_zona(a.get("desde")) or con_zona(a["creado"])).timestamp(), reverse=True)
        return self.serializar(avisos[:MAX_HISTORIAL])

    @action(detail=False, methods=["get"])
    def todos(self, request):
        avisos = list(self.coleccion.find({}, {"_id": 0}).sort("creado", -1))
        return self.serializar(avisos)

    def create(self, request):
        serializer = AvisoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        momento = ahora()
        aviso = {**serializer.validated_data, "id_aviso": uuid.uuid4().hex, "creado": momento,
                 "modificado": momento, "id_autor": str(request.user.id)}
        self.coleccion.insert_one(aviso)
        aviso.pop("_id", None)
        return self.serializar(aviso, status.HTTP_201_CREATED, varios=False)

    def partial_update(self, request, id_aviso=None):
        aviso = self.coleccion.find_one({"id_aviso": id_aviso}, {"_id": 0})
        if not aviso:
            return Response({"error": "No existe ese aviso."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AvisoSerializer(aviso, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        cambios = {**serializer.validated_data, "modificado": ahora()}
        self.coleccion.update_one({"id_aviso": id_aviso}, {"$set": cambios})
        return self.serializar({**aviso, **cambios}, varios=False)

    def destroy(self, request, id_aviso=None):
        resultado = self.coleccion.delete_one({"id_aviso": id_aviso})
        if not resultado.deleted_count:
            return Response({"error": "No existe ese aviso."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
