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
    padres = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list
    )
    imagen_portada = serializers.ImageField(required=False, allow_null=True)

    def validate(self, value):
        nombre = value.get('nombre', '')
        ficha_recibida = value.get('ficha', '')

        if not ficha_recibida:
            value['ficha'] = generar_ficha(nombre)
        else:
            value['ficha'] = generar_ficha(ficha_recibida)

        if value.get('imagen_portada') is None:
            value['imagen_portada'] = None

        return value

    def to_representation(self, instance):
        """
        Sobrescribe la salida para evitar que ImageField bloquee la URL en texto
        almacenada en MongoDB.
        """
        ret = super().to_representation(instance)
        ret['imagen_portada'] = instance.get('imagen_portada')
        return ret