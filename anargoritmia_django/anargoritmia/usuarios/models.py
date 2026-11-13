from django.db import models
from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    FIRMA_ALIAS = "alias"
    FIRMA_NOMBRE = "nombre"
    OPCIONES_FIRMA = [
        (FIRMA_ALIAS, "Alias"),
        (FIRMA_NOMBRE, "Nombre completo"),
    ]

    email = models.EmailField(unique=True)
    # Con qué se firman sus notas públicas. Por omisión el alias, para no
    # exponer el nombre real de nadie sin que lo decida.
    firma = models.CharField(max_length=10, choices=OPCIONES_FIRMA, default=FIRMA_ALIAS)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    @property
    def nombre_completo(self):
        return " ".join(p for p in (self.first_name.strip(), self.last_name.strip()) if p)

    @property
    def firma_publica(self):
        """Texto con el que aparecen sus notas; si eligió nombre y no lo tiene, el alias."""
        if self.firma == self.FIRMA_NOMBRE and self.nombre_completo:
            return self.nombre_completo
        return self.username
