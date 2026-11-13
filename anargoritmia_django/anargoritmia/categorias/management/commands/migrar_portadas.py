"""
Pasa las portadas guardadas en disco (uploads/) a MongoDB, comprimidas a WebP.

    python manage.py migrar_portadas --simular   # revisa sin escribir
    python manage.py migrar_portadas             # migra

- Solo toca categorías cuya portada aún apunta a /uploads/...
- Se puede repetir: lo ya migrado no se vuelve a procesar.
- No borra nada de uploads/: al final lista los archivos que ya no usa
  ninguna categoría, para que decidas si los eliminas.
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand

from categorias.imagenes import ImagenInvalida, archivo_local, comprimir, guardar_imagen
from db import db


def kb(n):
    return f"{n / 1024:.0f} KB"


class Command(BaseCommand):
    help = "Mueve las portadas de categoría de uploads/ a MongoDB (WebP)."

    def add_arguments(self, parser):
        parser.add_argument("--simular", action="store_true", help="Muestra lo que haría sin escribir.")

    def handle(self, *args, simular, **opciones):
        carpeta = settings.MEDIA_ROOT
        prefijo = "[simulación] " if simular else ""
        migradas = 0
        antes = despues = 0

        for categoria in db["Categoria"].find({}, {"id_categoria": 1, "nombre": 1, "imagen_portada": 1}):
            nombre = archivo_local(categoria.get("imagen_portada"))
            if not nombre:
                continue
            ruta = os.path.join(carpeta, nombre)
            if not os.path.exists(ruta):
                self.stdout.write(self.style.WARNING(
                    f"{categoria['nombre']}: no se encontró {nombre} en uploads/; se deja como está."
                ))
                continue
            try:
                with open(ruta, "rb") as archivo:
                    if simular:
                        contenido, ancho, alto = comprimir(archivo)
                        nueva = None
                    else:
                        nueva = guardar_imagen(archivo)
                        contenido = None
            except ImagenInvalida as error:
                self.stdout.write(self.style.WARNING(f"{categoria['nombre']}: {error}"))
                continue

            if nueva:
                db["Categoria"].update_one({"id_categoria": categoria["id_categoria"]},
                                           {"$set": {"imagen_portada": nueva}})
                id_imagen = nueva.rsplit("/", 1)[-1].split(".")[0]
                guardada = db["Imagen"].find_one({"id_imagen": id_imagen}, {"bytes": 1, "ancho": 1, "alto": 1})
                tam, ancho, alto = guardada["bytes"], guardada["ancho"], guardada["alto"]
            else:
                tam = len(contenido)
            original = os.path.getsize(ruta)
            antes, despues = antes + original, despues + tam
            migradas += 1
            self.stdout.write(f"{prefijo}{categoria['nombre']}: {nombre} {kb(original)} -> WebP {ancho}x{alto} {kb(tam)}")

        self.stdout.write(self.style.SUCCESS(
            f"{prefijo}{migradas} portadas migradas" + (f" ({kb(antes)} -> {kb(despues)})." if migradas else ".")
        ))

        # Archivos de uploads/ que ya no usa ninguna categoría
        if os.path.isdir(carpeta):
            en_uso = {archivo_local(c.get("imagen_portada")) for c in db["Categoria"].find({}, {"imagen_portada": 1})}
            sobrantes = sorted(f for f in os.listdir(carpeta) if f not in en_uso)
            if sobrantes and not simular:
                self.stdout.write(
                    f"Archivos de uploads/ sin uso ({len(sobrantes)}); puedes borrarlos: {', '.join(sobrantes)}"
                )
