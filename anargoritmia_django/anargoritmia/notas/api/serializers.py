from rest_framework import serializers
import re
import unicodedata
from db import db

TIPOS_BLOQUE = ("texto", "codigo", "animacion", "ejercicio")
MAX_PRERREQUISITOS = 5
MAX_BLOQUES = 300
MAX_CARACTERES_BLOQUE = 100_000
# Nombre de archivo de una celda: letras, números, punto, guion y guion bajo
PATRON_ARCHIVO = re.compile(r"^[\w.-]{1,80}$")


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
    # Texto con el que se firma (alias o nombre completo, según la persona).
    # Las notas anteriores al rediseño no lo tienen: se usa el alias.
    firma = serializers.SerializerMethodField()

    def get_firma(self, autor):
        return autor.get("firma") or autor.get("alias", "")


class BloqueSerializer(serializers.Serializer):
    """
    Unidad atómica de una nota (al estilo de las celdas de un cuaderno):
    - texto: Markdown con notación matemática KaTeX ($...$ y $$...$$).
    - codigo: código fuente para lectura, con lenguaje, versión y notas de replicación.
    - animacion: código JavaScript (Anime.js) que se ejecuta en un entorno aislado.
    - ejercicio: enunciado en `contenido`, con `pista` y `solucion` opcionales
      (Markdown + KaTeX); el lector las abre cuando quiere, después de intentarlo.
    `publico` decide si el bloque aparece en la versión publicada de la nota.
    `archivo` (p. ej. «newton.py») y `titulo` («Método de Newton») son
    opcionales; el cliente deriva un nombre si `archivo` queda vacío.
    """
    id = serializers.CharField(max_length=64)
    tipo = serializers.ChoiceField(choices=TIPOS_BLOQUE)
    publico = serializers.BooleanField(default=False)
    archivo = serializers.CharField(allow_blank=True, default="", max_length=80)
    titulo = serializers.CharField(allow_blank=True, default="", max_length=200)
    contenido = serializers.CharField(
        allow_blank=True, default="", max_length=MAX_CARACTERES_BLOQUE, trim_whitespace=False
    )
    lenguaje = serializers.CharField(allow_blank=True, default="", max_length=50)
    version = serializers.CharField(allow_blank=True, default="", max_length=50)
    notas = serializers.CharField(allow_blank=True, default="", max_length=5_000)
    pista = serializers.CharField(allow_blank=True, default="", max_length=20_000, trim_whitespace=False)
    solucion = serializers.CharField(
        allow_blank=True, default="", max_length=MAX_CARACTERES_BLOQUE, trim_whitespace=False
    )

    def validate_archivo(self, value):
        value = value.strip()
        if value and not PATRON_ARCHIVO.match(value):
            raise serializers.ValidationError(
                "Usa solo letras, números, punto, guion o guion bajo (sin espacios ni barras)."
            )
        return value

    def validate_titulo(self, value):
        return value.strip()


class ResumenCeldasSerializer(serializers.Serializer):
    """Conteo de celdas que se guarda junto a la nota para los listados."""
    total = serializers.IntegerField()
    publicas = serializers.IntegerField()
    tipos_publicos = serializers.ListField(child=serializers.CharField())


class NotaResumenSerializer(serializers.Serializer):
    """
    Versión ligera de la nota para listados (catálogo, Mis notas, Recientes):
    sin el contenido de las celdas, que puede pesar cientos de kilobytes.
    """
    id_documento = serializers.CharField()
    titulo = serializers.CharField()
    ficha = serializers.CharField()
    id_categoria = serializers.CharField()
    autor = AutorSerializer()
    etiquetas = serializers.ListField(child=serializers.CharField(), default=list)
    es_borrador = serializers.BooleanField()
    fecha_publicacion = serializers.DateTimeField(allow_null=True)
    fecha_modificacion = serializers.DateTimeField(allow_null=True)
    celdas = ResumenCeldasSerializer()
    correcciones_abiertas = serializers.IntegerField(required=False)

    def to_representation(self, instancia):
        datos = super().to_representation(instancia)
        if "correcciones_abiertas" not in instancia:
            datos.pop("correcciones_abiertas", None)
        return datos


class NotaSerializer(serializers.Serializer):
    # Los metadatos de identidad, autoría y publicación los fija el servidor
    id_documento = serializers.CharField(read_only=True)
    autor = AutorSerializer(read_only=True)
    ficha = serializers.CharField(read_only=True)
    fecha_publicacion = serializers.DateTimeField(read_only=True)
    fecha_modificacion = serializers.DateTimeField(read_only=True)
    celdas = ResumenCeldasSerializer(read_only=True)
    categoria = serializers.DictField(read_only=True, required=False)
    # Nota de la que se derivó esta (CC BY-SA obliga a atribuirla)
    origen = serializers.DictField(read_only=True, required=False, allow_null=True)
    # Ruta de estudio resuelta para la lectura: prerrequisitos y notas que siguen
    ruta = serializers.DictField(read_only=True, required=False)
    # Contador de versiones para el control de concurrencia: si se envía,
    # el guardado solo procede si la nota no cambió desde esa revisión.
    revision = serializers.IntegerField(required=False, min_value=0)

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
    # Notas que conviene leer antes (identificadores de notas publicadas)
    prerrequisitos = serializers.ListField(
        child=serializers.CharField(max_length=64),
        allow_empty=True,
        required=False,
        default=list,
        max_length=MAX_PRERREQUISITOS,
    )

    def to_representation(self, instancia):
        datos = super().to_representation(instancia)
        datos["revision"] = instancia.get("revision", 0)
        datos["prerrequisitos"] = instancia.get("prerrequisitos", [])
        for opcional in ("categoria", "origen", "ruta"):
            if opcional not in instancia:
                datos.pop(opcional, None)
        return datos

    def validate_prerrequisitos(self, value):
        """Solo notas publicadas, sin repetir y nunca la propia nota."""
        propia = self.context.get('id_documento')
        unicos = list(dict.fromkeys(v.strip() for v in value if v.strip()))
        if propia in unicos:
            raise serializers.ValidationError("Una nota no puede ser prerrequisito de sí misma.")
        if unicos == (self.context.get('nota') or {}).get('prerrequisitos', []):
            return unicos  # el autoguardado los reenvía sin cambios: no se consulta
        existentes = {
            n["id_documento"]
            for n in db['Nota'].find(
                {"id_documento": {"$in": unicos}, "es_borrador": False}, {"_id": 0, "id_documento": 1}
            )
        }
        faltantes = [v for v in unicos if v not in existentes]
        if faltantes:
            raise serializers.ValidationError("Los prerrequisitos deben ser notas publicadas.")
        return unicos

    def validate_id_categoria(self, value):
        """Integridad referencial: la categoría, si se indica, debe existir."""
        actual = (self.context.get('nota') or {}).get('id_categoria')
        if value == actual:  # el autoguardado la reenvía sin cambios: no se consulta
            return value
        if value and not db['Categoria'].find_one({"id_categoria": value}, {"_id": 1}):
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
            # Solo se consulta si la ficha cambia; el índice único es la última defensa
            if ficha and ficha != nota_actual.get('ficha'):
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
        if db['Nota'].find_one(consulta, {"_id": 1}):
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
