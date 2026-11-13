"""
Autenticación de la API: token de acceso JWT en «Authorization: Bearer …».

Igual que la de SimpleJWT, pero busca la cuenta en MongoDB
(usuarios/repositorio.py) en lugar del ORM. Rechaza cuentas borradas o
desactivadas aunque su token de acceso no haya vencido.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings

from usuarios import repositorio


class AutenticacionJWT(JWTAuthentication):
    def get_user(self, validated_token):
        id_usuario = validated_token.get(api_settings.USER_ID_CLAIM)
        if not id_usuario:
            raise InvalidToken("El token no identifica a ninguna cuenta.")
        usuario = repositorio.obtener(id_usuario)
        if usuario is None:
            raise AuthenticationFailed("La cuenta ya no existe.", code="user_not_found")
        if not usuario.is_active:
            raise AuthenticationFailed("La cuenta está desactivada.", code="user_inactive")
        return usuario
