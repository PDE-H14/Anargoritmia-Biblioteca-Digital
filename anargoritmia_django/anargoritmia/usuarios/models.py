"""
Cuentas de Anargoritmia.

Desde noviembre de 2026 las cuentas viven en MongoDB (colección «Usuario»),
junto con las notas, y el proyecto ya no usa base SQL. Esta clase no es un
modelo del ORM de Django: es un objeto de Python con lo que Django REST
Framework espera de `request.user` (is_authenticated, is_staff, pk...). La
lectura y escritura en la base están en usuarios/repositorio.py.

La contraseña se guarda con los hashers de Django (PBKDF2 por omisión), el
mismo formato que usaba SQLite: las cuentas migradas entran con su contraseña
de siempre.
"""
from types import SimpleNamespace

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import FieldDoesNotExist

# Nombres legibles de los campos, para los mensajes del validador de
# contraseñas de Django («demasiado parecida al alias»).
NOMBRES_DE_CAMPO = {
    "username": "alias",
    "email": "correo",
    "first_name": "nombre",
    "last_name": "apellidos",
}


class _Meta:
    """Lo mínimo de `_meta` que consulta UserAttributeSimilarityValidator."""

    @staticmethod
    def get_field(nombre):
        if nombre not in NOMBRES_DE_CAMPO:
            raise FieldDoesNotExist(nombre)
        return SimpleNamespace(verbose_name=NOMBRES_DE_CAMPO[nombre])


class Usuario:
    FIRMA_ALIAS = "alias"
    FIRMA_NOMBRE = "nombre"
    OPCIONES_FIRMA = [
        (FIRMA_ALIAS, "Alias"),
        (FIRMA_NOMBRE, "Nombre completo"),
    ]

    # Lo que Django y DRF consultan de request.user
    is_authenticated = True
    is_anonymous = False
    _meta = _Meta()

    def __init__(
        self,
        id=None,
        username="",
        email="",
        first_name="",
        last_name="",
        firma=FIRMA_ALIAS,
        password="",
        is_active=True,
        is_staff=False,
        is_superuser=False,
        date_joined=None,
        last_login=None,
    ):
        # `id` es texto: "15" para las cuentas migradas de SQLite y el
        # siguiente número del contador para las nuevas (repositorio.crear).
        self.id = None if id is None else str(id)
        self.username = username
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        # Con qué se firman sus notas públicas. Por omisión el alias, para no
        # exponer el nombre real de nadie sin que lo decida.
        self.firma = firma
        self.password = password
        self.is_active = is_active
        self.is_staff = is_staff
        self.is_superuser = is_superuser
        self.date_joined = date_joined
        self.last_login = last_login

    def __repr__(self):
        return f"<Usuario {self.id} {self.username}>"

    def __eq__(self, otro):
        return isinstance(otro, Usuario) and self.id is not None and self.id == otro.id

    def __hash__(self):
        return hash(self.id)

    @property
    def pk(self):
        return self.id

    def get_username(self):
        return self.email

    @property
    def nombre_completo(self):
        return " ".join(p for p in ((self.first_name or "").strip(), (self.last_name or "").strip()) if p)

    @property
    def firma_publica(self):
        """Texto con el que aparecen sus notas; si eligió nombre y no lo tiene, el alias."""
        if self.firma == self.FIRMA_NOMBRE and self.nombre_completo:
            return self.nombre_completo
        return self.username

    # --- Contraseña ---
    def set_password(self, crudo):
        self.password = make_password(crudo)

    def check_password(self, crudo):
        def actualizar_hash(crudo):
            # Django pide rehashear cuando sube las iteraciones de PBKDF2
            from usuarios import repositorio

            self.set_password(crudo)
            repositorio.guardar_password(self)

        return check_password(crudo, self.password, actualizar_hash)

    # --- Conversión con el documento de MongoDB ---
    CAMPOS = (
        "username", "email", "first_name", "last_name", "firma", "password",
        "is_active", "is_staff", "is_superuser", "date_joined", "last_login",
    )

    @classmethod
    def desde_documento(cls, documento):
        return cls(id=documento["id_usuario"], **{c: documento[c] for c in cls.CAMPOS if c in documento})

    def a_documento(self):
        documento = {"id_usuario": self.id, **{c: getattr(self, c) for c in self.CAMPOS}}
        # Claves en minúsculas para que correo y alias sean únicos sin
        # distinguir mayúsculas (índices únicos en setup_db.py)
        documento["email_clave"] = (self.email or "").strip().lower()
        documento["alias_clave"] = (self.username or "").strip().lower()
        return documento

    def recargar(self):
        """Vuelve a leer la cuenta de la base (equivale a refresh_from_db del ORM)."""
        from usuarios import repositorio

        actual = repositorio.obtener(self.id)
        if actual is None:
            raise LookupError(f"La cuenta {self.id} ya no existe.")
        self.__dict__.update(actual.__dict__)
        return self
