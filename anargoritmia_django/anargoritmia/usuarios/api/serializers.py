from rest_framework import serializers
from usuarios.models import Usuario

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ["id", "username", "email", 
                  "first_name", "last_name", 
                  "password", "is_active"]