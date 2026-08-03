# Inicio de la bd en Mongo
from db import db
from pymongo.errors import CollectionInvalid, DuplicateKeyError

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
                "description": "Cadena monolítica en Markdown con sintaxis KaTeX embebida."
            },
            "espacio_interactivo": {
                "bsonType": ["object", "null"],
                "description": "Estructura opcional para bloques de código interactivo.",
                "required": ["codigo_fuente"],
                "properties": {
                    "codigo_fuente": {
                        "bsonType": "string",
                        "description": "Código en JS/React/JSX a evaluar en el Sandbox."
                    },
                    "librerias": {
                        "bsonType": "array",
                        "description": "Lista de dependencias externas (ej. ['animejs', 'katex']).",
                        "items": {"bsonType": "string"}
                    },
                    "parametros_iniciales": {
                        "bsonType": "object",
                        "description": "Objeto JSON con las variables que alimentan los props del componente."
                    }
                }
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
            "padre_id": {
                "bsonType": ["string", "null"],
                "description": "ID de la categoría superior. Null si es una categoría principal."
            },
            "imagen_portada": {
                "bsonType":["string", "null"],
                "description": "Ruta/URL del recurso gráfico para la tarjeta del catálogo en React."
            }
        }
    }
}

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
        db.command("collMod", "Nota", validator=esquema_nota)
        print("Esquema validador de 'Nota' actualizado exitosamente.")

    # --- Gestión de la colección Categoria ---
    if "Categoria" not in colecciones_existentes:
        try:
            db.create_collection("Categoria", validator=esquema_categoria)
            print("Colección 'Categoria' creada exitosamente.")
        except Exception as e:
            print(f"Error al crear 'Categoria': {e}")
    else:
        db.command("collMod", "Categoria", validator=esquema_categoria)
        print("Esquema validador de 'Categoria' actualizado exitosamente.")

def inicializar_indices():
    """
    Garantiza la unicidad a nivel de motor de base de datos para evitar colisiones.
    """
    try:
        # Índices de unicidad para Categoría
        db['Categoria'].create_index("ficha", unique=True)
        db['Categoria'].create_index("id_categoria", unique=True)
        
        # Índice de unicidad para Nota
        db['Nota'].create_index("id_documento", unique=True)
        
        print("Índices de unicidad creados correctamente.")
    except DuplicateKeyError as e:
        print(f"Error de colisión: Existen datos duplicados en la base de datos que impiden crear el índice único.\nDetalle: {e}")

if __name__ == "__main__":
    # Limpieza preventiva de datos de prueba si es entorno de desarrollo
    # db['Categoria'].delete_many({}) 
    
    inicializar_colecciones()
    inicializar_indices()