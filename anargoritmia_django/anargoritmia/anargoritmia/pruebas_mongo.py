"""
Utilidades de prueba: sustituye la conexión real a MongoDB Atlas por una
base en memoria (mongomock) con los mismos índices únicos que crea setup_db.py.
"""
import shutil
import tempfile
from unittest import mock

import mongomock
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APISimpleTestCase

# Módulos que importan `db` directamente con `from db import db`
MODULOS_CON_DB = [
    "categorias.api.views",
    "notas.api.views",
    "notas.api.serializers",
    "notas.servicios",
    "notas.api.correcciones",
    "categorias.imagenes",
    "categorias.management.commands.migrar_portadas",
    "usuarios.repositorio",
    "usuarios.sesiones",
    "usuarios.management.commands.migrar_usuarios_sqlite",
    "avisos.api.views",
]


# Sin base SQL (DATABASES = {}): las pruebas no abren transacciones de Django
class MongoAPITestCase(APISimpleTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()  # los límites de peticiones (throttling) no pasan de una prueba a otra
        self.db = mongomock.MongoClient()["AnargoritmiaPruebas"]
        self.db["Categoria"].create_index("ficha", unique=True)
        self.db["Categoria"].create_index("id_categoria", unique=True)
        self.db["Nota"].create_index("id_documento", unique=True)
        self.db["Nota"].create_index([("ficha", 1), ("autor.id_usuario", 1)], unique=True)
        self.db["Imagen"].create_index("id_imagen", unique=True)
        self.db["Usuario"].create_index("id_usuario", unique=True)
        self.db["Usuario"].create_index("email_clave", unique=True)
        self.db["Usuario"].create_index("alias_clave", unique=True)
        self.db["Sesion"].create_index("jti", unique=True)

        for modulo in MODULOS_CON_DB:
            parche = mock.patch(f"{modulo}.db", self.db)
            parche.start()
            self.addCleanup(parche.stop)

        # Las imágenes subidas en pruebas van a una carpeta temporal
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)
