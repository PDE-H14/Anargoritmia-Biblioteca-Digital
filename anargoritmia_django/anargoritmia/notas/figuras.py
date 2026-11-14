"""
Figuras de las celdas de animación: el SVG que el código dibujó en el taller
del autor. El lector lo ve como <img>, donde el navegador no ejecuta scripts
ni pide nada a la red; aun así, aquí se exige un SVG sano y pequeño.
"""
import re
from xml.etree import ElementTree

MAX_BYTES_FIGURA = 200_000
NS_SVG = "{http://www.w3.org/2000/svg}"
# Sin DTD no hay entidades que expandir (ni «billion laughs»)
PROHIBIDO = re.compile(r"<!DOCTYPE|<!ENTITY", re.IGNORECASE)
ETIQUETAS_PROHIBIDAS = {"script", "foreignObject"}


class FiguraInvalida(ValueError):
    pass


def validar_svg(texto):
    if len(texto.encode("utf-8")) > MAX_BYTES_FIGURA:
        raise FiguraInvalida(f"La figura pesa más de {MAX_BYTES_FIGURA // 1000} KB; simplifícala.")
    if PROHIBIDO.search(texto):
        raise FiguraInvalida("La figura no puede declarar un DOCTYPE ni entidades.")
    try:
        raiz = ElementTree.fromstring(texto)
    except ElementTree.ParseError as e:
        raise FiguraInvalida("La figura no es un SVG válido.") from e
    if raiz.tag != f"{NS_SVG}svg":
        raise FiguraInvalida("La figura debe ser un elemento <svg>.")
    for elemento in raiz.iter():
        nombre = elemento.tag.split("}")[-1] if isinstance(elemento.tag, str) else ""
        if nombre in ETIQUETAS_PROHIBIDAS:
            raise FiguraInvalida(f"La figura no puede contener <{nombre}>.")
