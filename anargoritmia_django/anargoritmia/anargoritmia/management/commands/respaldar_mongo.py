"""
Respaldo de la base de MongoDB sin herramientas externas (mongodump).

    python manage.py respaldar_mongo [--destino CARPETA]

Escribe una carpeta con un archivo .jsonl por colección: un documento por
línea en JSON extendido canónico, que conserva fechas, ObjectId y binarios
(las portadas WebP). Es el formato que lee `mongoimport`, así que el
respaldo se puede restaurar con él o con un script de PyMongo. Guarda
también los índices de cada colección en indices.json.

Solo lee: no modifica la base. La conexión es la de db.py (MONGO_URI del
.env); la cadena nunca se imprime.
"""
import json
from datetime import datetime
from pathlib import Path

from bson import json_util
from django.conf import settings
from django.core.management.base import BaseCommand

from db import db

# Fuera del repositorio: Anargoritmia_general/respaldos/
DESTINO_POR_OMISION = Path(settings.BASE_DIR).resolve().parents[2] / "respaldos"


class Command(BaseCommand):
    help = "Copia todas las colecciones de MongoDB a archivos .jsonl (solo lectura)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--destino",
            default=str(DESTINO_POR_OMISION),
            help="Carpeta donde se crea el respaldo con fecha y hora (por omisión, respaldos/ fuera del repositorio).",
        )

    def handle(self, *args, **opciones):
        carpeta = Path(opciones["destino"]) / f"{db.name}-{datetime.now():%Y-%m-%d_%H%M%S}"
        carpeta.mkdir(parents=True, exist_ok=False)

        indices = {}
        total = 0
        for nombre in sorted(db.list_collection_names()):
            coleccion = db[nombre]
            cuenta = 0
            with open(carpeta / f"{nombre}.jsonl", "w", encoding="utf-8", newline="\n") as archivo:
                for documento in coleccion.find({}):
                    archivo.write(json_util.dumps(documento, json_options=json_util.CANONICAL_JSON_OPTIONS))
                    archivo.write("\n")
                    cuenta += 1
            indices[nombre] = json.loads(json_util.dumps(list(coleccion.list_indexes())))
            total += cuenta
            self.stdout.write(f"  {nombre}: {cuenta}")

        (carpeta / "indices.json").write_text(json.dumps(indices, ensure_ascii=False, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Respaldo listo: {total} documentos en {carpeta}"))
