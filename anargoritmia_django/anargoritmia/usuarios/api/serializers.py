from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as ErrorDjango
from rest_framework import serializers

from usuarios import repositorio
from usuarios.models import Usuario

MENSAJE_CORREO_REPETIDO = "Ya existe una cuenta con este correo."
MENSAJE_ALIAS_REPETIDO = "Ese alias ya está en uso; elige otro."


def guardar_o_400(funcion, usuario):
    """crear()/guardar() del repositorio; si dos peticiones chocan en el índice único, 400 y no 500."""
    try:
        return funcion(usuario)
    except repositorio.Duplicado as error:
        mensaje = MENSAJE_CORREO_REPETIDO if error.campo == "email" else MENSAJE_ALIAS_REPETIDO
        raise serializers.ValidationError({error.campo: [mensaje]})


class CamposDeCuenta(serializers.Serializer):
    """Campos y reglas comunes (los mismos límites que tenía el modelo de Django)."""

    id = serializers.CharField(read_only=True)
    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField(max_length=254)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def _id_propio(self):
        return self.instance.id if isinstance(self.instance, Usuario) else None

    def validate_email(self, value):
        value = value.strip()
        if repositorio.existe_email(value, excluir=self._id_propio()):
            raise serializers.ValidationError(MENSAJE_CORREO_REPETIDO)
        return value

    def validate_username(self, value):
        if repositorio.existe_alias(value, excluir=self._id_propio()):
            raise serializers.ValidationError(MENSAJE_ALIAS_REPETIDO)
        return value


class UserSerializer(CamposDeCuenta):
    """
    Serializador para la gestión administrativa de usuarios.
    La contraseña solo se acepta como entrada y siempre se guarda hasheada.
    """

    firma = serializers.ChoiceField(choices=Usuario.OPCIONES_FIRMA, required=False)
    password = serializers.CharField(write_only=True, required=False, max_length=128, style={"input_type": "password"})
    is_active = serializers.BooleanField(required=False)
    is_staff = serializers.BooleanField(required=False)

    def validate(self, datos):
        if self.instance is None and not datos.get("password"):
            raise serializers.ValidationError({"password": ["Este campo es requerido."]})
        return datos

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        return guardar_o_400(repositorio.crear, usuario)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if password:
            instance.set_password(password)
        return guardar_o_400(repositorio.guardar, instance)


class MeSerializer(UserSerializer):
    """
    Serializador para la autogestión del usuario activo.
    Los privilegios (is_staff, is_active) son de solo lectura: un usuario
    no puede otorgarse permisos de administrador ni reactivarse a sí mismo.
    """

    is_active = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)


class RegistroSerializer(CamposDeCuenta):
    """
    Alta abierta de cuentas (/api/auth/registro/).
    Cualquiera puede crearse una cuenta para escribir notas y proponer
    correcciones, pero nunca como administrador: los privilegios no se
    aceptan como entrada y la cuenta nace activa y sin is_staff.
    """

    password = serializers.CharField(write_only=True, min_length=8, max_length=128, style={"input_type": "password"})

    def validate_email(self, value):
        return super().validate_email(value.strip().lower())

    def validate(self, datos):
        # Validadores de contraseña de Django (longitud, comunes, solo números,
        # parecida al alias o al correo), con los datos de la cuenta nueva.
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
        return guardar_o_400(repositorio.crear, usuario)


class AccesoSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False, style={"input_type": "password"})


class TokenRenovacionSerializer(serializers.Serializer):
    refresh = serializers.CharField()
