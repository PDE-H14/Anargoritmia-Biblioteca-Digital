# Inicio de la bd en Mongo
from db import db
from pymongo.errors import CollectionInvalid

esquema_nota = {
    "$jsonSchema": {
        "bsonType": "object",
        "title": "Nota",
        "required": ["id_documento", "titulo", "autor", "licencia", "contenido", "es_borrador"],
        "properties": {
            "id_documento": {
                "bsonType": "string",
                "description": "Identificador agnóstico (UUID) para garantizar soberanía de los datos."
            },
            "titulo": {
                "bsonType": "string"
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
                "description": "Fuerza la distribución bajo Copyleft."
            },
            "id_categoria": {
                "bsonType": "string",
                "description": "Identificador de la categoría a la que pertenece la nota."
            },
            "etiquetas": {
                "bsonType": "array",
                "items": {
                    "bsonType": "string"
                }
            },
            "contenido": {
                "bsonType": "string",
                "description": "Cadena monolítica de Markdown con sintaxis KaTeX embebida."
            },
            "es_borrador": {
                "bsonType": "bool",
                "description": "Bandera lógica para aislar documentos inconclusos."
            },
            "fecha_publicacion": {
                "bsonType": "date"
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
                "bsonType": "string",
                "description": "Ruta/URL del recurso gráfico para la tarjeta del catálogo en React."
            }
        }
    }
}

def inicializar():
    colecciones_existentes = db.list_collection_names()

    # --- Gestión de la colección Nota ---
    if "Nota" not in colecciones_existentes:
        try:
            db.create_collection("Nota", validator=esquema_nota)
            print("Colección 'Nota' creada exitosamente.")
        except Exception as e:
            print(f"Error al crear 'Nota': {e}")
    else:
        # Actualiza el validador si la colección ya existe
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

if __name__ == "__main__":
    inicializar()