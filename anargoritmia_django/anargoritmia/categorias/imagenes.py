"""
Portadas de categoría guardadas en MongoDB (colección «Imagen»).

Al subirse, cada imagen se reduce a un máximo de 1600 px por lado y se
convierte a WebP (calidad 80): una portada pesa ~60–150 KB y las 84
categorías previstas ocupan unos 10 MB de los 512 MB gratuitos de Atlas.
No se usa GridFS: cada imagen queda muy por debajo del límite de 16 MB por
documento.

La API las sirve en /api/imagenes/<id>.webp (categorias/api/views.py) con
caché de un año: el id cambia con cada imagen nueva, así que la caché nunca
muestra una portada vieja. Se sirven desde el propio servidor, sin
peticiones a terceros, y sobreviven a un disco efímero.

Las rutas antiguas /uploads/... (disco local) siguen funcionando hasta
migrarlas con `manage.py migrar_portadas`.
"""
import io
import os
import re
import uuid
from datetime import datetime, timezone
from urllib.parse import unquote, urlparse

from bson.binary import Binary
from django.core.files.storage import FileSystemStorage
from PIL import Image, ImageOps, UnidentifiedImageError

from db import db

COLECCION = "Imagen"
LADO_MAXIMO = 1600
CALIDAD = 80
# Límites contra archivos enormes o «bombas» de descompresión
MAX_BYTES_ENTRADA = 10 * 1024 * 1024
MAX_PIXELES_ENTRADA = 40_000_000
TIPO = "image/webp"

PATRON_URL = re.compile(r"/api/imagenes/(?P<id>[0-9a-f]{32})\.webp$")


class ImagenInvalida(ValueError):
    """El archivo no es una imagen utilizable; el mensaje es para la persona."""


def url_de(id_imagen):
    return f"/api/imagenes/{id_imagen}.webp"


def comprimir(archivo):
    """Devuelve (bytes WebP, ancho, alto) de una imagen subida, reducida y orientada."""
    tamano = getattr(archivo, "size", None)
    if tamano is not None and tamano > MAX_BYTES_ENTRADA:
        raise ImagenInvalida("La imagen pesa más de 10 MB.")
    try:
        imagen = Image.open(archivo)
        if imagen.width * imagen.height > MAX_PIXELES_ENTRADA:
            raise ImagenInvalida("La imagen tiene demasiados píxeles; redúcela antes de subirla.")
        imagen.seek(0)  # en un GIF animado, el primer cuadro
        imagen = ImageOps.exif_transpose(imagen)  # fotos de celular giradas
        imagen.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ImagenInvalida("El archivo no es una imagen válida.") from error

    # WebP admite transparencia: se conserva si la imagen la tiene
    con_alfa = imagen.mode in ("RGBA", "LA") or (imagen.mode == "P" and "transparency" in imagen.info)
    imagen = imagen.convert("RGBA" if con_alfa else "RGB")
    imagen.thumbnail((LADO_MAXIMO, LADO_MAXIMO), Image.Resampling.LANCZOS)

    salida = io.BytesIO()
    imagen.save(salida, format="WEBP", quality=CALIDAD, method=6)
    return salida.getvalue(), imagen.width, imagen.height


def guardar_imagen(archivo):
    """Comprime y guarda la imagen; devuelve su ruta relativa (/api/imagenes/<id>.webp)."""
    contenido, ancho, alto = comprimir(archivo)
    id_imagen = uuid.uuid4().hex
    db[COLECCION].insert_one({
        "id_imagen": id_imagen,
        "tipo": TIPO,
        "contenido": Binary(contenido),
        "bytes": len(contenido),
        "ancho": ancho,
        "alto": alto,
        "fecha": datetime.now(timezone.utc),
    })
    return url_de(id_imagen)


def obtener(id_imagen):
    return db[COLECCION].find_one({"id_imagen": id_imagen}, {"_id": 0, "contenido": 1, "tipo": 1})


def archivo_local(url):
    """Nombre del archivo en MEDIA_ROOT de una ruta antigua /uploads/..., o None."""
    ruta = unquote(urlparse(url or "").path)
    if "/uploads/" not in ruta:
        return None
    return os.path.basename(ruta) or None


def borrar_imagen(url):
    """Elimina la imagen de una ruta /api/imagenes/... o, si es antigua, su archivo en uploads/."""
    if not url:
        return
    coincidencia = PATRON_URL.search(urlparse(url).path)
    if coincidencia:
        db[COLECCION].delete_one({"id_imagen": coincidencia["id"]})
        return
    nombre = archivo_local(url)
    fs = FileSystemStorage()
    if nombre and fs.exists(nombre):
        fs.delete(nombre)
