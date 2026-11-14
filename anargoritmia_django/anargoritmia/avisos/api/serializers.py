from rest_framework import serializers

TIPOS = ("importante", "mantenimiento", "novedad", "reconocimiento")
LUGARES = ("publico", "taller")


class AvisoSerializer(serializers.Serializer):
    """
    Aviso de la administración: novedades, mantenimientos, notas importantes
    y reconocimientos. Se muestra entre `desde` y `hasta` (vacíos: sin
    límite) en los `lugares` indicados: el sitio público, el taller o ambos.
    """
    id_aviso = serializers.CharField(read_only=True)
    titulo = serializers.CharField(max_length=120)
    texto = serializers.CharField(max_length=5000, allow_blank=True, default="", trim_whitespace=False)
    tipo = serializers.ChoiceField(choices=TIPOS, default="novedad")
    desde = serializers.DateTimeField(allow_null=True, required=False, default=None)
    hasta = serializers.DateTimeField(allow_null=True, required=False, default=None)
    lugares = serializers.ListField(
        child=serializers.ChoiceField(choices=LUGARES), min_length=1, max_length=2, default=lambda: ["publico", "taller"]
    )
    fijado = serializers.BooleanField(default=False)
    cerrable = serializers.BooleanField(default=True)
    creado = serializers.DateTimeField(read_only=True)
    modificado = serializers.DateTimeField(read_only=True)

    def validate_titulo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Escribe un título.")
        return value

    def validate_lugares(self, value):
        return list(dict.fromkeys(value))

    def validate(self, datos):
        desde = datos.get("desde", (self.instance or {}).get("desde"))
        hasta = datos.get("hasta", (self.instance or {}).get("hasta"))
        if desde and hasta and hasta <= desde:
            raise serializers.ValidationError({"hasta": "El fin debe ser posterior al inicio."})
        return datos
