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
                  "firma", "password", "is_active",
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


class RegistroSerializer(serializers.ModelSerializer):
    """
    Alta abierta de cuentas (/api/auth/registro/).
    Cualquiera puede crearse una cuenta para escribir notas y proponer
    correcciones, pero nunca como administrador: los privilegios no se
    aceptan como entrada y la cuenta nace activa y sin is_staff.
    """

    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    email = serializers.EmailField()

    class Meta:
        model = Usuario
        fields = ["id", "username", "email", "first_name", "last_name", "password"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        value = value.strip().lower()
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este correo.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ese alias ya está en uso; elige otro.")
        return value

    def validate(self, datos):
        # Validadores de contraseña de Django (longitud, comunes, solo números,
        # parecida al alias o al correo), con los datos de la cuenta nueva.
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as ErrorDjango

        candidato = Usuario(**{k: v for k, v in datos.items() if k != "password"})
        try:
            validate_password(datos["password"], user=candidato)
        except ErrorDjango as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        return datos

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data, is_staff=False, is_superuser=False, is_active=True)
        usuario.set_password(password)
        usuario.save()
        return usuario
