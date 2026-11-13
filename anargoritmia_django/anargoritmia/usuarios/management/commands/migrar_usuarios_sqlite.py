"""
Copia las cuentas de la base SQLite anterior (db.sqlite3) a MongoDB.

    python manage.py migrar_usuarios_sqlite --simular   # revisa sin escribir
    python manage.py migrar_usuarios_sqlite             # migra

- Conserva id, contraseña (el hash, así que cada quien entra con la suya),
  nombre, firma, privilegios y fechas. Como el id no cambia, las notas y
  correcciones siguen ligadas a su autor sin tocarlas.
- Se puede repetir: una cuenta ya migrada (mismo id) se actualiza, no se duplica.
- Abre el archivo en solo lectura y no lo modifica: queda como respaldo
  hasta que decidas borrarlo.
- Las sesiones abiertas no se migran: cada persona vuelve a entrar una vez.
"""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from db import db
from usuarios import repositorio
from usuarios.models import Usuario

TABLA = "usuarios_usuario"


def fecha(valor):
    """Fechas de SQLite ('2026-11-11 18:23:45.123456', en UTC) a datetime con zona."""
    if not valor:
        return None
    momento = datetime.fromisoformat(str(valor))
    return momento if momento.tzinfo else momento.replace(tzinfo=timezone.utc)


def usuario_desde_fila(fila):
    columnas = fila.keys()
    return Usuario(
        id=fila["id"],
        username=fila["username"],
        email=fila["email"],
        first_name=fila["first_name"] or "",
        last_name=fila["last_name"] or "",
        firma=fila["firma"] if "firma" in columnas and fila["firma"] else Usuario.FIRMA_ALIAS,
        password=fila["password"],
        is_active=bool(fila["is_active"]),
        is_staff=bool(fila["is_staff"]),
        is_superuser=bool(fila["is_superuser"]),
        date_joined=fecha(fila["date_joined"]),
        last_login=fecha(fila["last_login"]),
    )


class Command(BaseCommand):
    help = "Copia las cuentas de db.sqlite3 a la colección Usuario de MongoDB, conservando ids y contraseñas."

    def add_arguments(self, parser):
        parser.add_argument("--archivo", default=str(Path(settings.BASE_DIR) / "db.sqlite3"),
                            help="Base SQLite de origen (por omisión, db.sqlite3 junto a manage.py).")
        parser.add_argument("--simular", action="store_true", help="Muestra lo que haría sin escribir en MongoDB.")

    @staticmethod
    def conflicto(usuario):
        """
        Por qué no se puede migrar sin pisar a otra persona, o None.
        Repetir la migración de la misma cuenta (mismo id y mismo correo) no
        es conflicto: se actualiza.
        """
        actual = repositorio.obtener(usuario.id)
        if actual is not None and actual.email.strip().lower() != usuario.email.strip().lower():
            return f"en MongoDB el id {usuario.id} ya es de otra cuenta ({actual.username})."
        if repositorio.existe_email(usuario.email, excluir=usuario.id):
            return "otra cuenta de MongoDB ya usa ese correo."
        if repositorio.existe_alias(usuario.username, excluir=usuario.id):
            return "otra cuenta de MongoDB ya usa ese alias."
        return None

    def handle(self, *args, archivo, simular, **opciones):
        ruta = Path(archivo)
        if not ruta.exists():
            raise CommandError(f"No existe {ruta}.")
        conexion = sqlite3.connect(f"{ruta.resolve().as_uri()}?mode=ro", uri=True)
        conexion.row_factory = sqlite3.Row
        try:
            filas = conexion.execute(f"SELECT * FROM {TABLA} ORDER BY id").fetchall()
        except sqlite3.OperationalError as error:
            raise CommandError(f"{ruta} no tiene la tabla {TABLA}: {error}")
        finally:
            conexion.close()

        if not simular:
            repositorio.asegurar_indices()

        migradas, omitidas = [], []
        for fila in filas:
            usuario = usuario_desde_fila(fila)
            motivo = self.conflicto(usuario)
            if motivo:
                omitidas.append((usuario, motivo))
                continue
            if not simular:
                repositorio.importar(usuario)
            migradas.append(usuario)

        if filas and not simular:
            repositorio.ajustar_contador(max(int(f["id"]) for f in filas))

        prefijo = "[simulación] " if simular else ""
        for u in migradas:
            rol = "administrador" if u.is_staff else "cuenta"
            estado = "" if u.is_active else ", desactivada"
            self.stdout.write(f"{prefijo}{rol} {u.id} · {u.username}{estado}")
        for u, motivo in omitidas:
            self.stdout.write(self.style.WARNING(f"{prefijo}omitida {u.id} · {u.username}: {motivo}"))

        # Autores de notas que no tienen cuenta (ni migrada ni anónima)
        ids = {u.id for u in migradas} | {d["id_usuario"] for d in db["Usuario"].find({}, {"id_usuario": 1})}
        sin_cuenta = sorted(
            a for a in db["Nota"].distinct("autor.id_usuario")
            if a and not str(a).startswith("anonimo-") and a not in ids
        )
        if sin_cuenta:
            self.stdout.write(self.style.WARNING(
                f"Notas cuyo autor no tiene cuenta: ids {', '.join(sin_cuenta)}."
            ))

        resumen = f"{prefijo}{len(migradas)} migradas, {len(omitidas)} omitidas de {len(filas)}."
        self.stdout.write(self.style.SUCCESS(resumen))
        if not simular and migradas:
            self.stdout.write(f"{ruta.name} no se modificó; bórralo cuando compruebes que todo funciona.")
