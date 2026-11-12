import uuid
from db import db

ALIAS_ANONIMO = "Comunidad Anargoritmia"


def anonimizar_autor(id_usuario):
    """
    Derecho al olvido: al eliminar una cuenta
    - sus borradores (nunca publicados) se eliminan;
    - sus notas publicadas se conservan como aporte de la comunidad, sin
      alias, correo ni identificador del usuario original.
    Cada cuenta borrada recibe un identificador anónimo distinto para no
    romper el índice único (ficha, autor.id_usuario).
    """
    id_usuario = str(id_usuario)
    db["Nota"].delete_many({"autor.id_usuario": id_usuario, "es_borrador": True})
    db["Nota"].update_many(
        {"autor.id_usuario": id_usuario},
        {"$set": {"autor": {
            "id_usuario": f"anonimo-{uuid.uuid4().hex[:12]}",
            "alias": ALIAS_ANONIMO,
            "correo": "",
        }}},
    )


def actualizar_alias(id_usuario, alias):
    """Mantiene el alias visible de las notas al día cuando el usuario lo cambia."""
    db["Nota"].update_many(
        {"autor.id_usuario": str(id_usuario)}, {"$set": {"autor.alias": alias}}
    )
