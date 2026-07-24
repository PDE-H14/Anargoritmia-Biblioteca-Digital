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
                "required": ["id_usuario", "alias"],
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

def inicializar():
    try:
        db.create_collection("Nota", validator=esquema_nota)
        print("Colección 'Nota' creada exitosamente.")
    except CollectionInvalid:
        print("La colección 'Nota' ya existe.")

if __name__ == "__main__":
    inicializar()