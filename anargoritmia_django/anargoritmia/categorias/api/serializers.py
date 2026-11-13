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
    # Lista de fichas de las categorías padre
    padres = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list
    )
    imagen_portada = serializers.ImageField(required=False, allow_null=True)
    # Punto de enfoque de la portada, en % del ancho y del alto (50/50 = centro).
    # El catálogo recorta la banda 4:1 y la ficha 4:3 alrededor de él
    # (object-position), así que lo importante de la imagen siempre se ve.
    enfoque_x = serializers.FloatField(min_value=0, max_value=100, required=False)
    enfoque_y = serializers.FloatField(min_value=0, max_value=100, required=False)

    def validate(self, value):
        # La ficha solo se (re)calcula cuando llega un nombre o una ficha explícita;
        # en un PATCH que no los incluye se conserva la ficha almacenada.
        if value.get('ficha'):
            value['ficha'] = generar_ficha(value['ficha'])
        elif 'nombre' in value:
            value['ficha'] = generar_ficha(value['nombre'])
        else:
            value.pop('ficha', None)

        if 'ficha' in value and not value['ficha']:
            raise serializers.ValidationError(
                {"nombre": "El nombre debe contener al menos una letra o número."}
            )

        for eje in ('enfoque_x', 'enfoque_y'):
            if eje in value:
                value[eje] = round(value[eje], 1)

        if 'padres' in value and value.get('ficha') in value['padres']:
            raise serializers.ValidationError(
                {"padres": "Una categoría no puede ser padre de sí misma."}
            )

        return value

    def to_representation(self, instance):
        """
        Sobrescribe la salida para evitar que ImageField bloquee la URL en texto
        almacenada en MongoDB. Las rutas relativas (/uploads/...) se devuelven
        absolutas según el host de la petición, para no amarrar la BD a un dominio.
        """
        ret = super().to_representation(instance)
        imagen = instance.get('imagen_portada')
        request = self.context.get('request')
        if imagen and imagen.startswith('/') and request is not None:
            imagen = request.build_absolute_uri(imagen)
        ret['imagen_portada'] = imagen
        # Categorías anteriores al punto de enfoque: el centro
        ret['enfoque_x'] = instance.get('enfoque_x', 50)
        ret['enfoque_y'] = instance.get('enfoque_y', 50)
        return ret
