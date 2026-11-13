"""
Crea una cuenta de administrador o da ese rol a una existente. Sustituye a
`createsuperuser`, que necesitaba la base SQL.

    python manage.py crear_admin --email ana@ejemplo.mx --alias ana
    python manage.py crear_admin --email ana@ejemplo.mx --promover

La contraseña se pide en la terminal, sin mostrarla ni dejarla en el
historial, y pasa por los mismos validadores que el registro.
"""
from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from usuarios import repositorio
from usuarios.models import Usuario


class Command(BaseCommand):
    help = "Crea una cuenta de administrador o promueve una existente (--promover)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--alias", help="Alias público de la cuenta nueva (por omisión, lo anterior a la @).")
        parser.add_argument("--promover", action="store_true",
                            help="Da el rol de administrador a la cuenta con ese correo, sin cambiar su contraseña.")

    def handle(self, *args, email, alias, promover, **opciones):
        repositorio.asegurar_indices()
        existente = repositorio.por_email(email)

        if promover:
            if existente is None:
                raise CommandError(f"No hay ninguna cuenta con el correo {email}.")
            existente.is_staff = existente.is_active = True
            repositorio.guardar(existente)
            self.stdout.write(self.style.SUCCESS(f"{existente.username} ahora es administrador."))
            return

        if existente is not None:
            raise CommandError("Ya existe una cuenta con ese correo; usa --promover para hacerla administradora.")
        alias = alias or email.split("@")[0]
        if repositorio.existe_alias(alias):
            raise CommandError(f"El alias «{alias}» ya está en uso; elige otro con --alias.")

        usuario = Usuario(username=alias, email=email.strip().lower(), is_staff=True, is_superuser=True)
        clave = getpass("Contraseña: ")
        if clave != getpass("Repite la contraseña: "):
            raise CommandError("Las contraseñas no coinciden.")
        try:
            validate_password(clave, user=usuario)
        except ValidationError as error:
            raise CommandError(" ".join(error.messages))
        usuario.set_password(clave)
        try:
            repositorio.crear(usuario)
        except repositorio.Duplicado as error:
            raise CommandError(f"Ese {'correo' if error.campo == 'email' else 'alias'} ya está en uso.")
        self.stdout.write(self.style.SUCCESS(f"Administrador {usuario.username} creado (id {usuario.id})."))
