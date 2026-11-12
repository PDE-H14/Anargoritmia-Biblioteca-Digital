from rest_framework import serializers
from usuarios.models import Usuario


class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para la gestión administrativa de usuarios.
    La contraseña solo se acepta como entrada y siempre se guarda hasheada.
    """

    class Meta:
        model = Usuario
        fields = ["id", "username", "email",
                  "first_name", "last_name",
                  "password", "is_active",
                  "is_staff"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class MeSerializer(UserSerializer):
    """
    Serializador para la autogestión del usuario activo.
    Los privilegios (is_staff, is_active) son de solo lectura: un usuario
    no puede otorgarse permisos de administrador ni reactivarse a sí mismo.
    """

    class Meta(UserSerializer.Meta):
        read_only_fields = ["id", "is_active", "is_staff"]
