from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from anargoritmia.red import LimitePorAlcance
from notas.servicios import actualizar_autor, anonimizar_autor
from usuarios import repositorio, sesiones
from usuarios.api.serializers import (
    AccesoSerializer,
    MeSerializer,
    RegistroSerializer,
    TokenRenovacionSerializer,
    UserSerializer,
)

# Datos del usuario que aparecen en sus notas y correcciones
CAMPOS_DE_AUTORIA = ("username", "first_name", "last_name", "firma")


def autoria(usuario):
    return tuple(getattr(usuario, campo) for campo in CAMPOS_DE_AUTORIA)


def no_autorizado(mensaje):
    # 401 explícito: estas vistas no tienen autenticador, y DRF convertiría
    # un AuthenticationFailed en 403.
    return Response({"detail": mensaje}, status=status.HTTP_401_UNAUTHORIZED)


# --- Sesión: entrar, renovar y salir (usuarios/sesiones.py) ---
class AccesoView(APIView):
    """POST /api/auth/login/ {email, password} -> {access, refresh}."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        datos = AccesoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        usuario = repositorio.por_email(datos.validated_data["email"])
        clave = datos.validated_data["password"]
        if usuario is None:
            # Mismo costo que verificar una contraseña: el tiempo de respuesta
            # no revela si el correo tiene cuenta.
            make_password(clave)
        if usuario is None or not usuario.check_password(clave) or not usuario.is_active:
            return no_autorizado("Correo o contraseña incorrectos.")
        repositorio.registrar_acceso(usuario)
        return Response(sesiones.par_de_tokens(sesiones.abrir(usuario)))


class RenovarView(APIView):
    """POST /api/auth/renovar/ {refresh} -> {access, refresh}; el token anterior deja de servir."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        datos = TokenRenovacionSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        try:
            nuevo = sesiones.renovar(datos.validated_data["refresh"])
        except sesiones.SesionInvalida:
            return no_autorizado("La sesión venció o fue cerrada. Vuelve a entrar.")
        return Response(sesiones.par_de_tokens(nuevo))


class SalirView(APIView):
    """POST /api/auth/salir/ {refresh}: revoca ese token de renovación."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        datos = TokenRenovacionSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        sesiones.cerrar(datos.validated_data["refresh"])
        return Response({}, status=status.HTTP_200_OK)


# --- Administración de cuentas (solo staff) ---
class UserApiViewSet(ViewSet):
    # El hasheo de la contraseña ocurre en UserSerializer.create/update,
    # por lo que POST, PUT y PATCH quedan cubiertos por igual.
    permission_classes = [IsAdminUser]

    MENSAJE_ULTIMO_ADMIN = (
        "Operación denegada: el sistema debe conservar al menos un administrador activo."
    )
    MENSAJE_OTRO_ADMIN = (
        "Un administrador no puede modificar ni eliminar la cuenta de otro administrador. "
        "Cada quien cambia sus datos desde «Mis datos»; para quitarle el rol a alguien, "
        "quien administra la base usa el comando quitar_admin."
    )

    def proteger_admins(self, request, usuario):
        """Ni contraseña, ni rol, ni desactivar, ni borrar: la cuenta de otro admin es intocable."""
        if usuario.is_staff and str(usuario.id) != str(request.user.id):
            raise PermissionDenied(self.MENSAJE_OTRO_ADMIN)

    def get_serializer(self, *args, **kwargs):  # para la documentación de la API (drf-yasg)
        return UserSerializer(*args, **kwargs)

    def _obtener(self, pk):
        usuario = repositorio.obtener(pk)
        if usuario is None:
            raise NotFound("No existe esa cuenta.")
        return usuario

    def dejaria_sin_admins(self, usuario, sigue_siendo_admin):
        """True si quitarle a `usuario` el rol de staff activo dejaría el panel sin administradores."""
        if not (usuario.is_staff and usuario.is_active) or sigue_siendo_admin:
            return False
        return repositorio.admins_activos(excluir=usuario.id) == 0

    def list(self, request):
        return Response(UserSerializer(repositorio.listar(), many=True).data)

    def retrieve(self, request, pk=None):
        return Response(UserSerializer(self._obtener(pk)).data)

    def create(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None, partial=False):
        usuario = self._obtener(pk)
        self.proteger_admins(request, usuario)
        serializer = UserSerializer(usuario, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        sigue_siendo_admin = datos.get("is_staff", usuario.is_staff) and datos.get("is_active", usuario.is_active)
        if self.dejaria_sin_admins(usuario, sigue_siendo_admin):
            raise ValidationError({"error": self.MENSAJE_ULTIMO_ADMIN})
        anterior = autoria(usuario)
        # Restablecer la contraseña o desactivar la cuenta cierra sus sesiones abiertas
        cierra_sesiones = bool(datos.get("password")) or datos.get("is_active") is False
        serializer.save()
        if cierra_sesiones:
            sesiones.cerrar_todas(usuario.id)
        if autoria(usuario) != anterior:
            actualizar_autor(usuario)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk=pk, partial=True)

    def destroy(self, request, pk=None):
        usuario = self._obtener(pk)
        self.proteger_admins(request, usuario)
        if self.dejaria_sin_admins(usuario, sigue_siendo_admin=False):
            raise ValidationError({"error": self.MENSAJE_ULTIMO_ADMIN})
        repositorio.eliminar(usuario.id)
        sesiones.cerrar_todas(usuario.id)
        anonimizar_autor(usuario.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


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
            sesiones.cerrar_todas(user.id)
            respuesta["tokens"] = sesiones.par_de_tokens(sesiones.abrir(user))
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
        if user.is_staff and repositorio.admins_activos() <= 1:
            return Response(
                {"error": "Operación denegada: Eres el único administrador activo del sistema. No puedes autodestruirte."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Destrucción física del registro y anonimización de sus aportes
        repositorio.eliminar(user.id)
        sesiones.cerrar_todas(user.id)
        anonimizar_autor(user.id)
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
    throttle_classes = [LimitePorAlcance]
    throttle_scope = "registro"

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        respuesta = dict(MeSerializer(usuario).data)
        respuesta["tokens"] = sesiones.par_de_tokens(sesiones.abrir(usuario))
        return Response(respuesta, status=status.HTTP_201_CREATED)
