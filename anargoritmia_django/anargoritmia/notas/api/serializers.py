from rest_framework import serializers

class AutorSerializer(serializers.Serializer):
    """
    Serializador anidado para garantizar la integridad del sub-documento autor.
    """
    id_usuario = serializers.CharField(max_length=100)
    alias = serializers.CharField(max_length=100)
    correo = serializers.EmailField(required=False, allow_blank=True)

class NotaSerializer(serializers.Serializer):
    id_documento = serializers.CharField(max_length=255, required=False)
    
    titulo = serializers.CharField(max_length=255)
    autor = AutorSerializer()
    licencia = serializers.CharField(max_length=100, default="CC BY-SA 4.0")
    id_categoria = serializers.CharField(max_length=255)
    
    etiquetas = serializers.ListField(
        child=serializers.CharField(max_length=100),
        allow_empty=True,
        required=False
    )
    
    contenido = serializers.CharField()
    es_borrador = serializers.BooleanField(default=True)
    fecha_publicacion = serializers.DateTimeField(required=False, allow_null=True)

    def validate_licencia(self, value):
        """
        Garantiza jurídicamente la distribución bajo Copyleft CC BY-SA 4.0.
        """
        if value != "CC BY-SA 4.0":
            raise serializers.ValidationError(
                "Falla de licenciamiento: La producción científica de Anargoritmia "
                "debe distribuirse exclusivamente bajo la licencia CC BY-SA 4.0."
            )
        return value