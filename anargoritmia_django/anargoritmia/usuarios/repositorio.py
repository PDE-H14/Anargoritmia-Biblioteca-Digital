"""
Lectura y escritura de cuentas en MongoDB (colección «Usuario»).

Cada documento guarda los campos de usuarios.models.Usuario más
`id_usuario` (texto) y dos claves en minúsculas, `email_clave` y
`alias_clave`, con índice único: dos cuentas no pueden compartir correo ni
alias aunque cambien las mayúsculas. Los índices se crean en setup_db.py.

Los identificadores nuevos salen de un contador (colección «Contador»,
documento "usuario"), que la migración desde SQLite deja en el mayor id
migrado: las cuentas nuevas siguen la numeración de siempre y las notas no
cambian de autor.
"""
from django.utils import timezone
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from db import db
from usuarios.models import Usuario

COLECCION = "Usuario"
CONTADOR = "usuario"


class Duplicado(Exception):
    """Correo o alias ya usados por otra cuenta. `campo` es "email" o "username"."""

    def __init__(self, campo):
        super().__init__(campo)
        self.campo = campo


def _coleccion():
    return db[COLECCION]


def _cargar(documento):
    return Usuario.desde_documento(documento) if documento else None


def siguiente_id():
    documento = db["Contador"].find_one_and_update(
        {"_id": CONTADOR}, {"$inc": {"valor": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return str(documento["valor"])


def ajustar_contador(minimo):
    """El contador nunca queda por debajo de `minimo` (ids migrados)."""
    db["Contador"].update_one({"_id": CONTADOR}, {"$max": {"valor": int(minimo)}}, upsert=True)


# --- Consultas ---
def obtener(id_usuario):
    if id_usuario is None:
        return None
    return _cargar(_coleccion().find_one({"id_usuario": str(id_usuario)}))


def por_email(email):
    return _cargar(_coleccion().find_one({"email_clave": (email or "").strip().lower()}))


def por_alias(alias):
    return _cargar(_coleccion().find_one({"alias_clave": (alias or "").strip().lower()}))


def _existe(filtro, excluir):
    if excluir is not None:
        filtro = {**filtro, "id_usuario": {"$ne": str(excluir)}}
    return _coleccion().count_documents(filtro, limit=1) > 0


def existe_email(email, excluir=None):
    return _existe({"email_clave": (email or "").strip().lower()}, excluir)


def existe_alias(alias, excluir=None):
    return _existe({"alias_clave": (alias or "").strip().lower()}, excluir)


def listar():
    return [_cargar(d) for d in _coleccion().find({}).sort("date_joined", 1)]


def admins_activos(excluir=None):
    """Número de administradores activos, sin contar a `excluir` (id)."""
    filtro = {"is_staff": True, "is_active": True}
    if excluir is not None:
        filtro["id_usuario"] = {"$ne": str(excluir)}
    return _coleccion().count_documents(filtro)


# --- Escritura ---
def _duplicado(usuario):
    """Traduce un choque del índice único al campo repetido."""
    if existe_email(usuario.email, excluir=usuario.id):
        return Duplicado("email")
    return Duplicado("username")


def crear(usuario):
    """Guarda una cuenta nueva y le asigna su id. Lanza Duplicado si el correo o el alias ya existen."""
    usuario.id = siguiente_id()
    if usuario.date_joined is None:
        usuario.date_joined = timezone.now()
    try:
        _coleccion().insert_one(usuario.a_documento())
    except DuplicateKeyError:
        error = _duplicado(usuario)
        usuario.id = None
        raise error
    return usuario


def guardar(usuario):
    """Guarda todos los campos de una cuenta existente. Lanza Duplicado igual que crear()."""
    try:
        _coleccion().replace_one({"id_usuario": usuario.id}, usuario.a_documento())
    except DuplicateKeyError:
        raise _duplicado(usuario)
    return usuario


def guardar_password(usuario):
    _coleccion().update_one({"id_usuario": usuario.id}, {"$set": {"password": usuario.password}})


def registrar_acceso(usuario):
    usuario.last_login = timezone.now()
    _coleccion().update_one({"id_usuario": usuario.id}, {"$set": {"last_login": usuario.last_login}})


def eliminar(id_usuario):
    return _coleccion().delete_one({"id_usuario": str(id_usuario)}).deleted_count == 1


def importar(usuario):
    """Inserta o reemplaza una cuenta conservando su id (migración desde SQLite)."""
    _coleccion().replace_one({"id_usuario": usuario.id}, usuario.a_documento(), upsert=True)
    return usuario


def asegurar_indices():
    """
    Índices de cuentas y sesiones; create_index no repite los que ya existen.
    Lo llaman setup_db.py y la migración desde SQLite.
    """
    _coleccion().create_index("id_usuario", unique=True)
    _coleccion().create_index("email_clave", unique=True)
    _coleccion().create_index("alias_clave", unique=True)
    _coleccion().create_index([("is_staff", 1), ("is_active", 1)])
    db["Sesion"].create_index("jti", unique=True)
    db["Sesion"].create_index("id_usuario")
    # TTL: MongoDB borra cada sesión en cuanto vence su token de renovación
    # (revisa cada ~60 s). Sustituye a flushexpiredtokens y su tarea programada.
    db["Sesion"].create_index("expira", expireAfterSeconds=0)


def crear_usuario(username, email, password=None, **campos):
    """Atajo para comandos y pruebas, como create_user del ORM (sin validar la contraseña)."""
    usuario = Usuario(username=username, email=(email or "").strip(), **campos)
    if password is None:
        usuario.password = "!"  # contraseña inutilizable: nadie entra con ella
    else:
        usuario.set_password(password)
    return crear(usuario)
