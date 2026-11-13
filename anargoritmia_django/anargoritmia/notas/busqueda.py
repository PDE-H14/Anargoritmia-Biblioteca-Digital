"""
Búsqueda en el catálogo (?q= en GET /api/notas/).

Cada palabra de la consulta debe aparecer en el título, en el texto
público (`contenido`, que solo guarda las celdas de texto públicas), en
las etiquetas o en la firma del autor. No distingue mayúsculas ni
acentos: «algebra» encuentra «Álgebra» y viceversa.

Se resuelve con expresiones regulares para no depender de un índice de
texto: el catálogo de una licenciatura es pequeño. Si crece, conviene
pasar a un índice $text de MongoDB.
"""
import re
import unicodedata

MAX_CONSULTA = 100
MAX_PALABRAS = 8
CAMPOS = ("titulo", "contenido", "etiquetas", "autor.firma")

# Cada vocal (y la ñ/n) admite sus variantes con acento
VARIANTES = {
    "a": "aáàäâ", "e": "eéèëê", "i": "iíìïî", "o": "oóòöô", "u": "uúùüû", "n": "nñ", "c": "cç",
}


def _sin_acentos(texto):
    descompuesto = unicodedata.normalize("NFD", texto)
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")


def _patron(palabra):
    """Expresión regular que encuentra la palabra con o sin acentos."""
    partes = []
    for letra in _sin_acentos(palabra.lower()):
        if letra in VARIANTES:
            partes.append(f"[{VARIANTES[letra]}]")
        else:
            partes.append(re.escape(letra))
    return "".join(partes)


def palabras_de(consulta):
    consulta = (consulta or "").strip()[:MAX_CONSULTA]
    return [p for p in consulta.split() if p][:MAX_PALABRAS]


def filtro_busqueda(consulta):
    """Filtro de MongoDB para la consulta, o None si está vacía."""
    palabras = palabras_de(consulta)
    if not palabras:
        return None
    return {"$and": [
        {"$or": [{campo: {"$regex": _patron(p), "$options": "i"}} for campo in CAMPOS]}
        for p in palabras
    ]}
