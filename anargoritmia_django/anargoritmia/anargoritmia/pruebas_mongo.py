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
from rest_framework.test import APITestCase

# Módulos que importan `db` directamente con `from db import db`
MODULOS_CON_DB = [
    "categorias.api.views",
    "notas.api.views",
    "notas.api.serializers",
    "notas.servicios",
    "notas.api.correcciones",
]


class MongoAPITestCase(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()  # los límites de peticiones (throttling) no pasan de una prueba a otra
        self.db = mongomock.MongoClient()["AnargoritmiaPruebas"]
        self.db["Categoria"].create_index("ficha", unique=True)
        self.db["Categoria"].create_index("id_categoria", unique=True)
        self.db["Nota"].create_index("id_documento", unique=True)
        self.db["Nota"].create_index([("ficha", 1), ("autor.id_usuario", 1)], unique=True)

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
