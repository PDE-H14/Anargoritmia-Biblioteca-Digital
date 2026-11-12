from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from usuarios.models import Usuario
from usuarios.api.serializers import UserSerializer, MeSerializer
from notas.servicios import anonimizar_autor, actualizar_alias

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
        alias_anterior = usuario.username
        serializer.save()
        if usuario.username != alias_anterior:
            actualizar_alias(usuario.id, usuario.username)

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

        alias_anterior = user.username
        serializer = MeSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if user.username != alias_anterior:
            actualizar_alias(user.id, user.username)
        return Response(serializer.data, status=status.HTTP_200_OK)

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