from rest_framework import serializers
import re
import unicodedata
from db import db

TIPOS_BLOQUE = ("texto", "codigo", "animacion")
MAX_BLOQUES = 300
MAX_CARACTERES_BLOQUE = 100_000


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
    Subdocumento autor tal como se expone en la API.
    El correo se guarda en la BD pero no se publica: las notas son de
    lectura pública y no deben filtrar datos personales.
    """
    id_usuario = serializers.CharField(max_length=100)
    alias = serializers.CharField(max_length=100)


class BloqueSerializer(serializers.Serializer):
    """
    Unidad atómica de una nota (al estilo de las celdas de un cuaderno):
    - texto: Markdown con notación matemática KaTeX ($...$ y $$...$$).
    - codigo: código fuente para lectura, con lenguaje, versión y notas de replicación.
    - animacion: código JavaScript (Anime.js) que se ejecutará en un entorno aislado.
    `publico` decide si el bloque aparece en la versión publicada de la nota.
    """
    id = serializers.CharField(max_length=64)
    tipo = serializers.ChoiceField(choices=TIPOS_BLOQUE)
    publico = serializers.BooleanField(default=False)
    contenido = serializers.CharField(
        allow_blank=True, default="", max_length=MAX_CARACTERES_BLOQUE, trim_whitespace=False
    )
    lenguaje = serializers.CharField(allow_blank=True, default="", max_length=50)
    version = serializers.CharField(allow_blank=True, default="", max_length=50)
    notas = serializers.CharField(allow_blank=True, default="", max_length=5_000)


class NotaSerializer(serializers.Serializer):
    # Los metadatos de identidad, autoría y publicación los fija el servidor
    id_documento = serializers.CharField(read_only=True)
    autor = AutorSerializer(read_only=True)
    ficha = serializers.CharField(read_only=True)
    fecha_publicacion = serializers.DateTimeField(read_only=True)
    fecha_modificacion = serializers.DateTimeField(read_only=True)

    # Título y categoría pueden quedar vacíos mientras la nota sea borrador
    titulo = serializers.CharField(max_length=255, allow_blank=True, required=False, default="")
    id_categoria = serializers.CharField(max_length=255, allow_blank=True, required=False, default="")
    licencia = serializers.CharField(max_length=100, default="CC BY-SA 4.0")
    etiquetas = serializers.ListField(
        child=serializers.CharField(max_length=100),
        allow_empty=True,
        required=False,
        default=list
    )
    bloques = serializers.ListField(
        child=BloqueSerializer(),
        allow_empty=True,
        required=False,
        default=list,
        max_length=MAX_BLOQUES,
    )
    es_borrador = serializers.BooleanField(default=True)

    def validate_id_categoria(self, value):
        """Integridad referencial: la categoría, si se indica, debe existir."""
        if value and not db['Categoria'].find_one({"id_categoria": value}):
            raise serializers.ValidationError("La categoría especificada no existe.")
        return value

    def validate_licencia(self, value):
        """Garantiza la distribución bajo Copyleft CC BY-SA 4.0."""
        if value != "CC BY-SA 4.0":
            raise serializers.ValidationError(
                "La producción científica de Anargoritmia debe distribuirse "
                "exclusivamente bajo la licencia CC BY-SA 4.0."
            )
        return value

    def validate_bloques(self, value):
        ids = [b["id"] for b in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Cada bloque debe tener un identificador único.")
        return value

    def validate(self, value):
        # Estado final de la nota: lo almacenado + lo recibido (PATCH parcial)
        nota_actual = self.context.get('nota') or {}
        final = {**nota_actual, **value}

        titulo = value.get('titulo')
        if titulo is not None:
            value['titulo'] = titulo.strip()
            ficha = generar_ficha(value['titulo'])
            if value['titulo'] and not ficha:
                raise serializers.ValidationError(
                    {"titulo": "El título debe contener al menos una letra o número."}
                )
            if ficha:
                self.validar_titulo_unico(ficha)

        if not final.get('es_borrador', True):
            self.validar_publicable(final)

        return value

    def validar_titulo_unico(self, ficha):
        """
        Unicidad (autor, ficha). Al editar se usa el autor original de la nota
        (que puede no ser quien edita, p. ej. un administrador) y se excluye la
        propia nota.
        """
        id_autor = self.context.get('id_autor')
        if id_autor is None:
            request = self.context.get('request')
            if request is not None and request.user.is_authenticated:
                id_autor = str(request.user.id)
        if id_autor is None:
            return

        consulta = {"ficha": ficha, "autor.id_usuario": id_autor}
        id_documento = self.context.get('id_documento')
        if id_documento:
            consulta["id_documento"] = {"$ne": id_documento}
        if db['Nota'].find_one(consulta):
            raise serializers.ValidationError({
                "titulo": "Ya existe un documento de este autor con este título."
            })

    @staticmethod
    def validar_publicable(nota):
        """Requisitos mínimos para que una nota salga del estado de borrador."""
        errores = {}
        if not (nota.get('titulo') or "").strip():
            errores["titulo"] = "Una nota publicada necesita título."
        if not nota.get('id_categoria'):
            errores["id_categoria"] = "Una nota publicada necesita categoría."
        if not any(b.get('publico') and (b.get('contenido') or "").strip()
                   for b in nota.get('bloques', [])):
            errores["bloques"] = "Marca como público al menos un bloque con contenido."
        if errores:
            raise serializers.ValidationError(errores)
