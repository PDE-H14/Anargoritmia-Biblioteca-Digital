from rest_framework import serializers
import re
import unicodedata
from db import db

def generar_ficha(texto: str) -> str:
    """
    Normaliza y purga una cadena de texto para generar una ficha válida para URLs:
    'Álgebra & Análisis Matemático!' -> 'algebra-analisis-matematico'
    Símbolos que no pertenezcan al bloque ASCII básico se omiten.
    """
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    texto = texto.lower().strip()
    texto = re.sub(r'[^a-z0-9]+', '-', texto)
    return re.sub(r'^-+|-+$', '', texto)


class AutorSerializer(serializers.Serializer):
    """
    Serializador anidado para garantizar la integridad del subdocumento autor.
    """
    id_usuario = serializers.CharField(max_length=100)
    alias = serializers.CharField(max_length=100)
    correo = serializers.EmailField(required=False, allow_blank=True)


class EspacioInteractivoSerializer(serializers.Serializer):
    """
    Serializador para el bloque de código interactivo (JS/React/JSX).
    """
    codigo_fuente = serializers.CharField(allow_blank=True, allow_null=True, required=False, default="")
    librerias = serializers.ListField(
        child=serializers.CharField(max_length=100),
        allow_empty=True,
        required=False,
        default=list
    )
    parametros_iniciales = serializers.DictField(
        required=False,
        default=dict,
    )


class NotaSerializer(serializers.Serializer):
    id_documento = serializers.CharField(max_length=255, required=False)
    titulo = serializers.CharField(max_length=255)
    autor = AutorSerializer(read_only=True)
    ficha = serializers.CharField(read_only=True)
    licencia = serializers.CharField(max_length=100, default="CC BY-SA 4.0")
    id_categoria = serializers.CharField(max_length=255)
    
    etiquetas = serializers.ListField(
        child=serializers.CharField(max_length=100),
        allow_empty=True,
        required=False,
        default=list
    )
    
    contenido = serializers.CharField()
    espacio_interactivo = EspacioInteractivoSerializer(required=False, allow_null=True, default=None)
    es_borrador = serializers.BooleanField(default=True)
    fecha_publicacion = serializers.DateTimeField(required=False, allow_null=True)

    def validate_id_categoria(self, value):
        """
        Garantiza la integridad referencial consultando la existencia del UUID 
        en la colección Categoria antes de permitir la inserción.
        """
        if value:
            categoria_existente = db['Categoria'].find_one({"id_categoria": value})
            if not categoria_existente:
                raise serializers.ValidationError(
                    "Violación de integridad: La categoría especificada no existe."
                )
        return value

    def validate_licencia(self, value):
        """
        Garantiza la distribución bajo Copyleft CC BY-SA 4.0.
        """
        if value != "CC BY-SA 4.0":
            raise serializers.ValidationError(
                "Falla de licenciamiento: La producción científica de Anargoritmia "
                "debe distribuirse exclusivamente bajo la licencia CC BY-SA 4.0."
            )
        return value

    def validate(self, value):
        titulo = value.get('titulo')
        request = self.context.get('request')
        
        if titulo:
            ficha_calculada = generar_ficha(titulo)
            value['ficha'] = ficha_calculada
            
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                id_usuario = str(request.user.id)
                
                query = {
                    "ficha": ficha_calculada,
                    "autor.id_usuario": id_usuario
                }
                
                # Si es en una actualización (PUT/PATCH), debemos excluir el documento actual
                id_documento = value.get('id_documento')
                if not id_documento and self.context.get('view'):
                    id_documento = self.context['view'].kwargs.get('id_documento')
                
                if id_documento:
                    query["id_documento"] = {"$ne": id_documento}
                
                if db['Nota'].find_one(query):
                    raise serializers.ValidationError({
                        "titulo": "Conflicto de unicidad: Ya has publicado un documento científico con este título."
                    })

        if value.get('es_borrador', True):
            value['fecha_publicacion'] = None

        return value