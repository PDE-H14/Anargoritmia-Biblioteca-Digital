import uuid
from db import db

ALIAS_ANONIMO = "Comunidad Anargoritmia"


def autor_de(usuario):
    """
    Subdocumento `autor` que se guarda en notas y correcciones.
    `firma` es el texto público (alias o nombre completo, según elija la
    persona); el correo se guarda pero nunca se expone.
    """
    return {
        "id_usuario": str(usuario.id),
        "alias": usuario.username,
        "firma": usuario.firma_publica,
        "correo": usuario.email,
    }


def anonimizar_autor(id_usuario):
    """
    Derecho al olvido: al eliminar una cuenta
    - sus borradores (nunca publicados) se eliminan, con sus correcciones;
    - sus notas publicadas se conservan como aporte de la comunidad, sin
      alias, correo ni identificador del usuario original;
    - las correcciones que propuso se conservan, también anónimas.
    Cada cuenta borrada recibe un identificador anónimo distinto para no
    romper el índice único (ficha, autor.id_usuario).
    """
    id_usuario = str(id_usuario)
    borradores = [n["id_documento"] for n in db["Nota"].find(
        {"autor.id_usuario": id_usuario, "es_borrador": True}, {"id_documento": 1}
    )]
    if borradores:
        db["Nota"].delete_many({"id_documento": {"$in": borradores}})
        db["Correccion"].delete_many({"id_documento": {"$in": borradores}})

    anonimo = {
        "id_usuario": f"anonimo-{uuid.uuid4().hex[:12]}",
        "alias": ALIAS_ANONIMO,
        "firma": ALIAS_ANONIMO,
        "correo": "",
    }
    db["Nota"].update_many({"autor.id_usuario": id_usuario}, {"$set": {"autor": anonimo}})
    db["Correccion"].update_many({"autor.id_usuario": id_usuario}, {"$set": {"autor": anonimo}})


def actualizar_autor(usuario):
    """Mantiene alias y firma de sus notas y correcciones al día cuando cambian sus datos."""
    autor = autor_de(usuario)
    cambios = {"autor.alias": autor["alias"], "autor.firma": autor["firma"]}
    db["Nota"].update_many({"autor.id_usuario": autor["id_usuario"]}, {"$set": cambios})
    db["Correccion"].update_many({"autor.id_usuario": autor["id_usuario"]}, {"$set": cambios})
