"""
Sesiones con JWT guardadas en MongoDB (colección «Sesion»).

Cada token de renovación vigente tiene un documento {jti, id_usuario,
expira}. Un token de renovación solo sirve si su documento existe:
- entrar crea uno;
- renovar lo borra y crea el del token nuevo (rotación: el anterior ya no sirve);
- salir lo borra;
- cambiar la contraseña, desactivar o borrar la cuenta borra todos los de esa persona.

La limpieza de sesiones vencidas es automática: el índice TTL sobre `expira`
(setup_db.py) hace que MongoDB borre cada documento cuando su token caduca.
Sustituye a la app token_blacklist de SimpleJWT y a su comando
flushexpiredtokens, que necesitaban una base SQL y una tarea programada.

Los tokens de acceso (15 minutos) no se guardan: se validan por su firma y,
en cada petición, con la cuenta (usuarios/autenticacion.py), así que una
cuenta desactivada o borrada deja de entrar de inmediato.
"""
from datetime import datetime, timezone

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from db import db
from usuarios import repositorio

COLECCION = "Sesion"


class SesionInvalida(Exception):
    """Token vencido, mal firmado, ya rotado o revocado, o de una cuenta inactiva."""


def _coleccion():
    return db[COLECCION]


def abrir(usuario):
    """Emite un token de renovación para `usuario` y registra su sesión."""
    token = RefreshToken.for_user(usuario)
    _coleccion().insert_one({
        "jti": token[api_settings.JTI_CLAIM],
        "id_usuario": str(usuario.id),
        "expira": datetime.fromtimestamp(token["exp"], tz=timezone.utc),
        "creada": datetime.now(timezone.utc),
    })
    return token


def _leer(texto):
    try:
        return RefreshToken(texto)
    except TokenError as error:
        raise SesionInvalida(str(error)) from error


def renovar(texto):
    """Cambia un token de renovación vigente por uno nuevo. Devuelve el nuevo."""
    token = _leer(texto)
    # Borrar y comprobar en una sola operación: dos renovaciones simultáneas
    # con el mismo token no pueden ganar ambas.
    if _coleccion().find_one_and_delete({"jti": token[api_settings.JTI_CLAIM]}) is None:
        raise SesionInvalida("La sesión ya no es válida.")
    usuario = repositorio.obtener(token.get(api_settings.USER_ID_CLAIM))
    if usuario is None or not usuario.is_active:
        raise SesionInvalida("La cuenta no existe o está desactivada.")
    return abrir(usuario)


def cerrar(texto):
    """Revoca un token de renovación. Si ya no era válido no hay nada que cerrar."""
    try:
        token = _leer(texto)
    except SesionInvalida:
        return
    _coleccion().delete_one({"jti": token[api_settings.JTI_CLAIM]})


def cerrar_todas(id_usuario):
    """Revoca todas las sesiones de una cuenta (contraseña nueva, desactivación o borrado)."""
    return _coleccion().delete_many({"id_usuario": str(id_usuario)}).deleted_count


def par_de_tokens(token):
    return {"access": str(token.access_token), "refresh": str(token)}
