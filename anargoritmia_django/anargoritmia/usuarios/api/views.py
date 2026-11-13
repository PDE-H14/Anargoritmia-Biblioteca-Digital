from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from usuarios.models import Usuario
from usuarios.api.serializers import UserSerializer, MeSerializer, RegistroSerializer
from notas.servicios import anonimizar_autor, actualizar_autor

# Datos del usuario que aparecen en sus notas y correcciones
CAMPOS_DE_AUTORIA = ("username", "first_name", "last_name", "firma")


def autoria(usuario):
    return tuple(getattr(usuario, campo) for campo in CAMPOS_DE_AUTORIA)


def revocar_sesiones(usuario):
    """Pone en la lista negra todos los tokens de renovación vigentes del usuario."""
    for token in OutstandingToken.objects.filter(user=usuario):
        BlacklistedToken.objects.get_or_create(token=token)

class UserApiViewSet(ModelViewSet):
    # El hasheo de la contraseña ocurre en UserSerializer.create/update,
    # por lo que POST, PUT y PATCH quedan cubiertos por igual.
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    queryset = Usuario.objects.all()

    MENSAJE_ULTIMO_ADMIN = (
        "Operación denegada: el sistema debe conservar al menos un administrador activo."
    )

    def dejaria_sin_admins(self, usuario, sigue_siendo_admin):
        """True si quitarle a `usuario` el rol de staff activo dejaría el panel sin administradores."""
        if not (usuario.is_staff and usuario.is_active) or sigue_siendo_admin:
            return False
        return not Usuario.objects.filter(is_staff=True, is_active=True).exclude(pk=usuario.pk).exists()

    def perform_update(self, serializer):
        usuario = serializer.instance
        datos = serializer.validated_data
        sigue_siendo_admin = datos.get("is_staff", usuario.is_staff) and datos.get("is_active", usuario.is_active)
        if self.dejaria_sin_admins(usuario, sigue_siendo_admin):
            raise ValidationError({"error": self.MENSAJE_ULTIMO_ADMIN})
        anterior = autoria(usuario)
        # Restablecer la contraseña o desactivar la cuenta cierra sus sesiones abiertas
        cierra_sesiones = bool(datos.get("password")) or datos.get("is_active") is False
        serializer.save()
        if cierra_sesiones:
            revocar_sesiones(usuario)
        if autoria(usuario) != anterior:
            actualizar_autor(usuario)

    def perform_destroy(self, instance):
        if self.dejaria_sin_admins(instance, sigue_siendo_admin=False):
            raise ValidationError({"error": self.MENSAJE_ULTIMO_ADMIN})
        id_usuario = instance.id
        instance.delete()
        anonimizar_autor(id_usuario)


class UserView(APIView):
    """
    Endpoint para la autogestión del usuario activo.
    Permite la lectura, actualización parcial y eliminación de su propia cuenta
    sin necesidad de privilegios (staff).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        data = request.data.copy()

        # Una contraseña vacía significa "no cambiarla"
        if not data.get("password"):
            data.pop("password", None)
        password_actual = data.pop("password_actual", "")
        if isinstance(password_actual, list):  # QueryDict en peticiones de formulario
            password_actual = password_actual[0] if password_actual else ""

        # Cambiar la contraseña exige confirmar la actual: un token robado o
        # una sesión abierta en otro equipo no bastan para tomar la cuenta.
        if "password" in data and not user.check_password(password_actual or ""):
            return Response(
                {"password_actual": ["La contraseña actual no es correcta."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        anterior = autoria(user)
        serializer = MeSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if autoria(user) != anterior:
            actualizar_autor(user)

        respuesta = dict(serializer.data)
        if "password" in data:
            # La contraseña cambió: se cierran las sesiones de todos los
            # dispositivos y este recibe tokens nuevos para seguir dentro.
            revocar_sesiones(user)
            nuevo = RefreshToken.for_user(user)
            respuesta["tokens"] = {"access": str(nuevo.access_token), "refresh": str(nuevo)}
        return Response(respuesta, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user

        # Confirmación de identidad: el borrado exige la contraseña actual
        if not user.check_password(request.data.get("password") or ""):
            return Response(
                {"error": "Contraseña incorrecta. La cuenta no fue eliminada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # CERROJO: Evitar que el panel de administración quede huérfano.
        # El panel se rige por is_staff (IsAdminUser), así que se cuenta staff activo.
        if user.is_staff:
            admin_actives = Usuario.objects.filter(is_staff=True, is_active=True).count()
            if admin_actives <= 1:
                return Response(
                    {"error": "Operación denegada: Eres el único administrador activo del sistema. No puedes autodestruirte."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Destrucción física del registro y anonimización de sus aportes
        id_usuario = user.id
        user.delete()
        anonimizar_autor(id_usuario)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegistroView(APIView):
    """
    POST /api/auth/registro/: cualquiera crea su cuenta y entra de inmediato.
    La cuenta nunca es de administrador (ver RegistroSerializer). Responde con
    los datos de la cuenta y un par de tokens, como si acabara de iniciar sesión.
    Límite: DEFAULT_THROTTLE_RATES['registro'] por dirección IP.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "registro"

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        tokens = RefreshToken.for_user(usuario)
        respuesta = dict(MeSerializer(usuario).data)
        respuesta["tokens"] = {"access": str(tokens.access_token), "refresh": str(tokens)}
        return Response(respuesta, status=status.HTTP_201_CREATED)
