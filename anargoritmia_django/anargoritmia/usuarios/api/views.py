from rest_framework.viewsets import ModelViewSet
from usuarios.models import Usuario
from rest_framework.permissions import IsAdminUser
from usuarios.api.serializers import UserSerializer

class UserApiViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    queryset = Usuario.objects.all()