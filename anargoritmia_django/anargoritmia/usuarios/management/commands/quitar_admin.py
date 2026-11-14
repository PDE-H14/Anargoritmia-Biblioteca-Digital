"""
Quita el rol de administrador a una cuenta. Desde el panel, un admin no puede
modificar a otro (usuarios/api/views.py): esto queda para quien administra la
base, con acceso a la terminal y al .env del servidor.

    python manage.py quitar_admin --alias ana
    python manage.py quitar_admin --email ana@ejemplo.mx

La cuenta sigue existiendo como usuario común y se cierran sus sesiones.
"""
from django.core.management.base import BaseCommand, CommandError

from usuarios import repositorio, sesiones


class Command(BaseCommand):
    help = "Quita el rol de administrador a una cuenta (por --alias o --email)."

    def add_arguments(self, parser):
        grupo = parser.add_mutually_exclusive_group(required=True)
        grupo.add_argument("--alias")
        grupo.add_argument("--email")

    def handle(self, *args, alias, email, **opciones):
        usuario = repositorio.por_alias(alias) if alias else repositorio.por_email(email)
        if usuario is None:
            raise CommandError("No hay ninguna cuenta con ese " + ("alias." if alias else "correo."))
        if not usuario.is_staff:
            raise CommandError(f"{usuario.username} no es administrador.")
        if usuario.is_active and repositorio.admins_activos(excluir=usuario.id) == 0:
            raise CommandError("Es el único administrador activo: crea o promueve otro antes (crear_admin).")
        usuario.is_staff = usuario.is_superuser = False
        repositorio.guardar(usuario)
        sesiones.cerrar_todas(usuario.id)
        self.stdout.write(self.style.SUCCESS(f"{usuario.username} ya no es administrador; sus sesiones se cerraron."))
