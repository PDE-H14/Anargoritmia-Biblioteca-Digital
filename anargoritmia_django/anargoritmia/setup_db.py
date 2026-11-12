# Inicio de la bd en Mongo
from db import db
from pymongo.errors import OperationFailure

esquema_nota = {
    "$jsonSchema": {
        "bsonType": "object",
        "title": "Nota",
        "required": [
            "id_documento",
            "titulo",
            "autor",
            "licencia",
            "id_categoria",
            "contenido",
            "bloques",
            "es_borrador"
        ],
        "properties": {
            "id_documento": {
                "bsonType": "string",
                "description": "Identificador agnóstico (UUID) para garantizar la soberanía de los datos."
            },
            "titulo": {
                "bsonType": "string",
                "description": "Título principal de la nota o investigación."
            },
            "autor": {
                "bsonType": "object",
                "required": ["id_usuario", "alias", "correo"],
                "properties": {
                    "id_usuario": {"bsonType": "string"},
                    "alias": {"bsonType": "string"},
                    "correo": {"bsonType": "string"}
                }
            },
            "ficha": {
                "bsonType": "string",
                "description": "Cadena normalizada del título para enrutamiento web y control de colisiones"
            },
            "licencia": {
                "bsonType": "string",
                "enum": ["CC BY-SA 4.0"],
                "description": "Fuerza la distribución inalienable bajo Copyleft."
            },
            "id_categoria": {
                "bsonType": "string",
                "description": "UUID o identificador de la categoría a la que pertenece la nota."
            },
            "etiquetas": {
                "bsonType": "array",
                "items": {
                    "bsonType": "string"
                },
                "description": "Metadatos secundarios para filtrado dinámico (ej. 'python', 'katex')."
            },
            "contenido": {
                "bsonType": "string",
                "description": "Texto plano derivado de los bloques de texto públicos (búsqueda y vista previa)."
            },
            "bloques": {
                "bsonType": "array",
                "description": "Celdas de la nota, en orden de lectura.",
                "items": {
                    "bsonType": "object",
                    "required": ["id", "tipo", "publico", "contenido"],
                    "properties": {
                        "id": {"bsonType": "string"},
                        "tipo": {"enum": ["texto", "codigo", "animacion"]},
                        "publico": {
                            "bsonType": "bool",
                            "description": "Si el bloque aparece en la versión publicada."
                        },
                        "contenido": {
                            "bsonType": "string",
                            "description": "Markdown + KaTeX (texto), código fuente (codigo) o JS de Anime.js (animacion)."
                        },
                        "lenguaje": {"bsonType": "string"},
                        "version": {"bsonType": "string"},
                        "notas": {"bsonType": "string", "description": "Notas de replicación del código."}
                    }
                }
            },
            "fecha_modificacion": {
                "bsonType": ["date", "null"],
                "description": "Último guardado (incluye el autoguardado)."
            },
            "es_borrador": {
                "bsonType": "bool",
                "description": "Bandera lógica para aislar documentos inconclusos."
            },
            "fecha_publicacion": {
                "bsonType": ["date", "null"],
                "description": "Fecha de liberación pública. Permite valores null en estado borrador."
            }
        }
    }
}

esquema_categoria = {
    "$jsonSchema": {
        "bsonType": "object",
        "title": "Categoria",
        "required": ["id_categoria", "nombre", "ficha"],
        "properties": {
            "id_categoria": {
                "bsonType": "string",
                "description": "UUID agnóstico de la categoría."
            },
            "nombre": {
                "bsonType": "string",
                "description": "Nombre visible (ej. 'Finanzas Cuantitativas')."
            },
            "ficha": {
                "bsonType": "string",
                "description": "Cadena unívoca para URLs (ej. 'finanzas-cuantitativas')."
            },
            "descripcion": {
                "bsonType": "string",
                "description": "Explicación del alcance académico del área."
            },
            "padres": {
                "bsonType": "array",
                "items": {"bsonType": "string"},
                "description": "Fichas de las categorías superiores. Vacío si es una categoría raíz."
            },
            "imagen_portada": {
                "bsonType":["string", "null"],
                "description": "Ruta/URL del recurso gráfico para la tarjeta del catálogo en React."
            }
        }
    }
}

def actualizar_validador(nombre, esquema):
    """
    collMod requiere un rol con privilegios de administración (p. ej. dbAdmin
    o Atlas admin); con un usuario readWrite se informa y se continúa.
    """
    try:
        db.command("collMod", nombre, validator=esquema)
        print(f"Esquema validador de '{nombre}' actualizado exitosamente.")
    except OperationFailure as e:
        print(f"AVISO: no se pudo actualizar el validador de '{nombre}' ({e.details.get('errmsg', e)}). "
              "Usa un usuario con rol dbAdmin para aplicarlo.")

def inicializar_colecciones():
    colecciones_existentes = db.list_collection_names()

    # --- Gestión de la colección Nota ---
    if "Nota" not in colecciones_existentes:
        try:
            db.create_collection("Nota", validator=esquema_nota)
            print("Colección 'Nota' creada exitosamente.")
        except Exception as e:
            print(f"Error al crear 'Nota': {e}")
    else:
        actualizar_validador("Nota", esquema_nota)

    # --- Gestión de la colección Categoria ---
    if "Categoria" not in colecciones_existentes:
        try:
            db.create_collection("Categoria", validator=esquema_categoria)
            print("Colección 'Categoria' creada exitosamente.")
        except Exception as e:
            print(f"Error al crear 'Categoria': {e}")
    else:
        actualizar_validador("Categoria", esquema_categoria)

def inicializar_indices():
    """
    Garantiza la unicidad a nivel de motor de base de datos para evitar colisiones.
    """
    try:
        # Índices únicos para la colección Categoria
        db['Categoria'].create_index("ficha", unique=True)
        db['Categoria'].create_index("id_categoria", unique=True)
        
        # Índice único para el identificador soberano de la Nota
        db['Nota'].create_index("id_documento", unique=True)
        
        # Índice compuesto único para la Nota:
        db['Nota'].create_index(
            [("ficha", 1), ("autor.id_usuario", 1)],
            unique=True
        )
        
        print("Índices de unicidad configurados con éxito en MongoDB Atlas.")
    except Exception as e:
        print(f"Error al inicializar índices: {e}")

def migrar_notas_a_bloques():
    """
    Convierte las notas del modelo anterior (un solo `contenido` Markdown y
    `espacio_interactivo`) al modelo por bloques. Es idempotente: solo toca
    notas que aún no tienen `bloques`.
    """
    import uuid
    migradas = 0
    for nota in db["Nota"].find({"bloques": {"$exists": False}}):
        publico = not nota.get("es_borrador", True)
        bloques = []
        if nota.get("contenido"):
            bloques.append({"id": uuid.uuid4().hex, "tipo": "texto", "publico": publico,
                            "contenido": nota["contenido"], "lenguaje": "", "version": "", "notas": ""})
        interactivo = nota.get("espacio_interactivo") or {}
        if interactivo.get("codigo_fuente"):
            bloques.append({"id": uuid.uuid4().hex, "tipo": "animacion", "publico": False,
                            "contenido": interactivo["codigo_fuente"], "lenguaje": "javascript",
                            "version": "", "notas": ""})
        db["Nota"].update_one(
            {"_id": nota["_id"]},
            {"$set": {"bloques": bloques, "fecha_modificacion": nota.get("fecha_publicacion")},
             "$unset": {"espacio_interactivo": ""}},
        )
        migradas += 1
    print(f"Notas migradas al modelo por bloques: {migradas}")

if __name__ == "__main__":
    # Limpieza  de datos de prueba si es entorno de desarrollo
    # db['Categoria'].delete_many({}) 
    
    inicializar_colecciones()
    inicializar_indices()
    migrar_notas_a_bloques()