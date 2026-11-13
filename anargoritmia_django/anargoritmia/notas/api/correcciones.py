"""
Correcciones comunitarias: observaciones de lectores sobre una celda pública
de una nota publicada. Para que sean útiles y no comentarios sueltos, cada una
señala la celda, un tipo de error permitido para esa clase de celda y una
descripción mínima; solo la ven quien la propuso, el autor de la nota y la
administración.
"""
import uuid
from datetime import datetime, timezone

from rest_framework import serializers, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from db import db
from notas.servicios import autor_de

TIPOS_ERROR = {
    "matematico": "Error matemático",
    "codigo": "El código falla",
    "replicacion": "No se puede replicar",
    "redaccion": "Redacción confusa o errata",
    "referencia": "Falta o es incorrecta una referencia",
}

# Qué errores tienen sentido en cada clase de celda
ERRORES_POR_CELDA = {
    "texto": ["matematico", "redaccion", "referencia"],
    "codigo": ["codigo", "replicacion", "matematico", "redaccion"],
    "animacion": ["codigo", "matematico", "redaccion"],
}

ESTADOS = ("abierta", "atendida", "descartada")
MIN_DESCRIPCION = 20
MAX_ABIERTAS_POR_NOTA = 5


def ahora():
    fecha = datetime.now(timezone.utc)
    return fecha.replace(microsecond=fecha.microsecond // 1000 * 1000)


def error(mensaje, codigo=status.HTTP_400_BAD_REQUEST):
    return Response({"error": mensaje}, status=codigo)


def es_responsable(nota, usuario):
    """El autor de la nota o la administración atienden sus correcciones."""
    return nota["autor"]["id_usuario"] == str(usuario.id) or usuario.is_staff


class AutorCorreccionSerializer(serializers.Serializer):
    id_usuario = serializers.CharField()
    firma = serializers.SerializerMethodField()

    def get_firma(self, autor):
        return autor.get("firma") or autor.get("alias", "")


class CorreccionSerializer(serializers.Serializer):
    id_correccion = serializers.CharField(read_only=True)
    id_documento = serializers.CharField(read_only=True)
    id_bloque = serializers.CharField(max_length=64)
    tipo_bloque = serializers.CharField(read_only=True)
    tipo_error = serializers.ChoiceField(choices=list(TIPOS_ERROR))
    fragmento = serializers.CharField(allow_blank=True, default="", max_length=300)
    descripcion = serializers.CharField(max_length=2000)
    autor = AutorCorreccionSerializer(read_only=True)
    estado = serializers.CharField(read_only=True)
    respuesta = serializers.CharField(read_only=True)
    fecha_creacion = serializers.DateTimeField(read_only=True)
    fecha_resolucion = serializers.DateTimeField(read_only=True, allow_null=True)

    def validate_descripcion(self, value):
        value = value.strip()
        if len(value) < MIN_DESCRIPCION:
            raise serializers.ValidationError(
                f"Explica el error con al menos {MIN_DESCRIPCION} caracteres: qué está mal y, si puedes, cómo corregirlo."
            )
        return value

    def validate_fragmento(self, value):
        return value.strip()

    def validate(self, datos):
        """La celda debe ser pública en la nota y admitir ese tipo de error."""
        nota = self.context["nota"]
        bloque = next(
            (b for b in nota.get("bloques", []) if b.get("id") == datos["id_bloque"] and b.get("publico")),
            None,
        )
        if bloque is None:
            raise serializers.ValidationError({"id_bloque": "Elige una celda pública de la nota."})

        permitidos = ERRORES_POR_CELDA.get(bloque["tipo"], [])
        if datos["tipo_error"] not in permitidos:
            nombres = ", ".join(TIPOS_ERROR[t].lower() for t in permitidos)
            raise serializers.ValidationError(
                {"tipo_error": f"En una celda de {bloque['tipo']} los errores posibles son: {nombres}."}
            )
        datos["tipo_bloque"] = bloque["tipo"]
        return datos


class ResolucionSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=ESTADOS)
    respuesta = serializers.CharField(allow_blank=True, default="", max_length=1000)


def listar_correcciones(nota, usuario, estado=None):
    """Responsables ven todas; cualquier otra persona, solo las suyas."""
    consulta = {"id_documento": nota["id_documento"]}
    if not es_responsable(nota, usuario):
        consulta["autor.id_usuario"] = str(usuario.id)
    if estado in ESTADOS:
        consulta["estado"] = estado
    return list(db["Correccion"].find(consulta, {"_id": 0}).sort("fecha_creacion", -1))


def crear_correccion(nota, usuario, data, contexto):
    if nota.get("es_borrador"):
        return error("Solo se pueden proponer correcciones a notas publicadas.", status.HTTP_404_NOT_FOUND)
    if nota["autor"]["id_usuario"] == str(usuario.id):
        return error("Es tu nota: corrígela directamente en el taller.")

    serializer = CorreccionSerializer(data=data, context={**contexto, "nota": nota})
    serializer.is_valid(raise_exception=True)
    datos = dict(serializer.validated_data)

    propias = {"id_documento": nota["id_documento"], "autor.id_usuario": str(usuario.id), "estado": "abierta"}
    if db["Correccion"].find_one({**propias, "id_bloque": datos["id_bloque"], "tipo_error": datos["tipo_error"]},
                                 {"_id": 1}):
        return error("Ya propusiste una corrección de este tipo para esta celda; espera a que el autor la atienda.")
    if db["Correccion"].count_documents(propias) >= MAX_ABIERTAS_POR_NOTA:
        return error(f"Tienes {MAX_ABIERTAS_POR_NOTA} correcciones abiertas en esta nota; espera a que se atiendan.")

    datos.update({
        "id_correccion": str(uuid.uuid4()),
        "id_documento": nota["id_documento"],
        "autor": autor_de(usuario),
        "estado": "abierta",
        "respuesta": "",
        "fecha_creacion": ahora(),
        "fecha_resolucion": None,
    })
    db["Correccion"].insert_one(datos)
    datos.pop("_id", None)
    return Response(CorreccionSerializer(datos).data, status=status.HTTP_201_CREATED)


def contar_abiertas(ids_documento):
    """{id_documento: correcciones abiertas} en una sola consulta."""
    if not ids_documento:
        return {}
    grupos = db["Correccion"].aggregate([
        {"$match": {"id_documento": {"$in": list(ids_documento)}, "estado": "abierta"}},
        {"$group": {"_id": "$id_documento", "n": {"$sum": 1}}},
    ])
    return {g["_id"]: g["n"] for g in grupos}


class CorreccionViewSet(viewsets.GenericViewSet):
    """
    PATCH  /api/correcciones/{id}/: el autor de la nota (o staff) la marca como
           atendida o descartada, con una respuesta opcional; o la reabre.
    DELETE /api/correcciones/{id}/: quien la propuso la retira mientras siga abierta
           (staff puede retirar cualquiera).
    """
    lookup_field = "id_correccion"
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CorreccionSerializer

    def obtener(self, id_correccion):
        correccion = db["Correccion"].find_one({"id_correccion": id_correccion}, {"_id": 0})
        if not correccion:
            return None, None
        nota = db["Nota"].find_one({"id_documento": correccion["id_documento"]}, {"autor": 1, "_id": 0})
        return correccion, nota

    def partial_update(self, request, id_correccion=None):
        correccion, nota = self.obtener(id_correccion)
        if not correccion:
            return error("La corrección no existe.", status.HTTP_404_NOT_FOUND)
        if not nota or not es_responsable(nota, request.user):
            return error("Solo el autor de la nota o la administración atienden sus correcciones.",
                         status.HTTP_403_FORBIDDEN)

        serializer = ResolucionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cambios = dict(serializer.validated_data)
        cambios["respuesta"] = cambios["respuesta"].strip()
        cambios["fecha_resolucion"] = None if cambios["estado"] == "abierta" else ahora()

        actualizada = db["Correccion"].find_one_and_update(
            {"id_correccion": id_correccion}, {"$set": cambios}, return_document=True,
        )
        actualizada.pop("_id", None)
        return Response(CorreccionSerializer(actualizada).data)

    def destroy(self, request, id_correccion=None):
        correccion, _ = self.obtener(id_correccion)
        if not correccion:
            return error("La corrección no existe.", status.HTTP_404_NOT_FOUND)
        propia = correccion["autor"]["id_usuario"] == str(request.user.id)
        if not (request.user.is_staff or (propia and correccion["estado"] == "abierta")):
            return error("Solo puedes retirar tus propias correcciones mientras sigan abiertas.",
                         status.HTTP_403_FORBIDDEN)
        db["Correccion"].delete_one({"id_correccion": id_correccion})
        return Response(status=status.HTTP_204_NO_CONTENT)


class LimiteCorrecciones(ScopedRateThrottle):
    """Límite de propuestas por persona (ver DEFAULT_THROTTLE_RATES['correcciones'])."""

    def allow_request(self, request, view):
        if request.method != "POST":
            return True
        return super().allow_request(request, view)
