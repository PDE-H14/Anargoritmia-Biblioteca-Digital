import logging

from pymongo.errors import PyMongoError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

registro = logging.getLogger(__name__)

MENSAJE_BD = (
    "La base de datos no responde en este momento. Tus datos no se perdieron; "
    "inténtalo de nuevo en unos minutos."
)


def manejador_excepciones(exc, context):
    """
    Manejador de DRF: lo de siempre, más los fallos de MongoDB.
    Un error de conexión con Atlas (IP no autorizada, red caída, tiempo
    agotado) se convierte en un 503 con mensaje legible en lugar de un 500.
    """
    respuesta = exception_handler(exc, context)
    if respuesta is None and isinstance(exc, PyMongoError):
        registro.error("MongoDB no disponible en %s: %s", context.get("view").__class__.__name__, exc)
        return Response({"error": MENSAJE_BD}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return respuesta
