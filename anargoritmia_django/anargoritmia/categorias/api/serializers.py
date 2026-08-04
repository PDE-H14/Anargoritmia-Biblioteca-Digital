import re
import unicodedata
from rest_framework import serializers

def generar_ficha(texto: str) -> str:
    """
    Normaliza y purga una cadena de texto para generar una ficha válida para URLs:
    'Álgebra & Análisis Matemático!' -> 'algebra-analisis-matematico'
    """
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    texto = texto.lower().strip()
    texto = re.sub(r'[^a-z0-9]+', '-', texto)
    return re.sub(r'^-+|-+$', '', texto)

class CategoriaSerializer(serializers.Serializer):
    id_categoria = serializers.CharField(read_only=True)
    nombre = serializers.CharField(max_length=100, allow_blank=False)
    ficha = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    descripcion = serializers.CharField(required=False, allow_blank=True)
    padre_id = serializers.CharField(allow_null=True, required=False, default=None)
    imagen_portada = serializers.CharField(max_length=255, 
    required=False, 
    allow_blank=True, 
    allow_null=True)

    def validate(self, value):
        """
        Garantiza la generación y limpieza estricta de la ficha.
        """
        nombre = value.get('nombre', '')
        ficha_recibida = value.get('ficha', '')

        # Si no envían ficha, la construimos desde el nombre; si la envían, la purgamos.
        if not ficha_recibida:
            value['ficha'] = generar_ficha(nombre)
        else:
            value['ficha'] = generar_ficha(ficha_recibida)

        if value.get('imagen_portada') is None:
            value['imagen_portada'] = ''

        return value