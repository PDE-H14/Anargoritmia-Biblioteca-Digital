from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password
from usuarios.models import Usuario
from usuarios.api.serializers import UserSerializer

class UserApiViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    queryset = Usuario.objects.all()

    def create(self, request, *args, **kwargs):
        request.data["password"] = make_password(request.data["password"])
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        password = request.data.get("password")
        if password:
            request.data["password"] = make_password(password)
        return super().partial_update(request, *args, **kwargs)


class UserView(APIView):
    """
    Endpoint para la autogestión del usuario activo.
    Permite la lectura, actualización parcial y eliminación de su propia cuenta
    sin necesidad de privilegios (staff).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        data = request.data.copy() 

        password = data.get("password")
        if password:
            data["password"] = make_password(password)
        else:
            data.pop("password", None)

        serializer = UserSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user

        # CERROJO: Evitar que el panel de administración quede huérfano
        if user.is_staff and user.is_superuser:
            admin_actives = Usuario.objects.filter(is_superuser=True, is_active=True).count()
            if admin_actives <= 1:
                return Response(
                    {"error": "Operación denegada: Eres el único administrador activo del sistema. No puedes autodestruirte."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Destrucción física del registro en la base de datos
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)