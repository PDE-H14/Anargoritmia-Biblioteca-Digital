"""
Dirección IP del cliente para los límites de peticiones.

DRF, sin NUM_PROXIES, identifica al cliente con el encabezado
X-Forwarded-For completo, que cualquiera puede inventar: con uno distinto en
cada petición se saltaba el límite de registros. Aquí solo se confía en lo
que se configura:

- IP_ENCABEZADOS: encabezados que pone el proxy y el cliente no puede
  falsificar (en Render, detrás de Cloudflare: CF-Connecting-IP).
- IP_PROXIES: cuántos proxies propios agregan su salto a X-Forwarded-For; se
  toma la dirección que agregó el más externo.
- Si no hay nada configurado, REMOTE_ADDR.

Con DIAGNOSTICO_IP=True, GET /api/diagnostico/ip/ muestra a quien la pide qué
llega en esos encabezados (solo sus propios datos), para comprobar la
configuración en producción.
"""
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView


def _meta(nombre):
    return "HTTP_" + nombre.upper().replace("-", "_")


def ip_del_cliente(request):
    """Devuelve (ip, fuente) según la configuración de confianza."""
    meta = request.META
    for encabezado in getattr(settings, "IP_ENCABEZADOS", []):
        valor = meta.get(_meta(encabezado), "").split(",")[0].strip()
        if valor:
            return valor, encabezado
    saltos = getattr(settings, "IP_PROXIES", 0)
    reenviado = meta.get("HTTP_X_FORWARDED_FOR", "")
    if saltos and reenviado:
        partes = [p.strip() for p in reenviado.split(",") if p.strip()]
        if len(partes) >= saltos:
            return partes[-saltos], f"X-Forwarded-For[-{saltos}]"
    return meta.get("REMOTE_ADDR", ""), "REMOTE_ADDR"


class LimitePorAlcance(ScopedRateThrottle):
    """ScopedRateThrottle que identifica a los anónimos por su IP real."""

    def get_ident(self, request):
        return ip_del_cliente(request)[0]


class DiagnosticoIPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not getattr(settings, "DIAGNOSTICO_IP", False):
            return Response({"error": "No disponible."}, status=404)
        ip, fuente = ip_del_cliente(request)
        meta = request.META
        return Response({
            "ip_usada": ip,
            "fuente": fuente,
            "encabezados": {
                nombre: meta.get(_meta(nombre), "")
                for nombre in ("X-Forwarded-For", "CF-Connecting-IP", "True-Client-IP", "X-Real-IP")
            },
            "remote_addr": meta.get("REMOTE_ADDR", ""),
        })
