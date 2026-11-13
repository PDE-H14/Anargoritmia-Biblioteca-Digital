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
                    "firma": {"bsonType": "string", "description": "Texto público: alias o nombre completo, según elija la persona."},
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
            "categorias_extra": {
                "bsonType": "array",
                "maxItems": 3,
                "items": {"bsonType": "string"},
                "description": "Otras categorías en las que también aparece la nota (además de la principal)."
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
                        "tipo": {"enum": ["texto", "codigo", "animacion", "ejercicio"]},
                        "pista": {"bsonType": "string", "description": "Pista de un ejercicio (Markdown + KaTeX)."},
                        "solucion": {"bsonType": "string", "description": "Solución de un ejercicio (Markdown + KaTeX)."},
                        "publico": {
                            "bsonType": "bool",
                            "description": "Si el bloque aparece en la versión publicada."
                        },
                        "contenido": {
                            "bsonType": "string",
                            "description": "Markdown + KaTeX (texto), código fuente (codigo) o JS de Anime.js (animacion)."
                        },
                        "archivo": {"bsonType": "string", "description": "Nombre de archivo de la celda (p. ej. newton.py)."},
                        "titulo": {"bsonType": "string", "description": "Título del algoritmo o de la animación."},
                        "lenguaje": {"bsonType": "string"},
                        "version": {"bsonType": "string"},
                        "notas": {"bsonType": "string", "description": "Notas de replicación del código."}
                    }
                }
            },
            "celdas": {
                "bsonType": "object",
                "description": "Conteo derivado (total, públicas, tipos públicos) para listados sin cargar las celdas.",
                "properties": {
                    "total": {"bsonType": "int"},
                    "publicas": {"bsonType": "int"},
                    "tipos_publicos": {"bsonType": "array", "items": {"bsonType": "string"}}
                }
            },
            "prerrequisitos": {
                "bsonType": "array",
                "items": {"bsonType": "string"},
                "description": "Notas publicadas que conviene leer antes (ruta de estudio)."
            },
            "origen": {
                "bsonType": ["object", "null"],
                "description": "Nota de la que se derivó esta: id_documento, título y firma (atribución CC BY-SA)."
            },
            "revision": {
                "bsonType": ["int", "long"],
                "description": "Contador de guardados para el control de concurrencia (409 si cambió)."
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
            },
            "enfoque_x": {
                "bsonType": ["double", "int"], "minimum": 0, "maximum": 100,
                "description": "Punto de enfoque horizontal de la portada (%); el recorte se hace a su alrededor."
            },
            "enfoque_y": {
                "bsonType": ["double", "int"], "minimum": 0, "maximum": 100,
                "description": "Punto de enfoque vertical de la portada (%)."
            }
        }
    }
}

esquema_correccion = {
    "$jsonSchema": {
        "bsonType": "object",
        "title": "Correccion",
        "required": ["id_correccion", "id_documento", "id_bloque", "tipo_error",
                     "descripcion", "autor", "estado", "fecha_creacion"],
        "properties": {
            "id_correccion": {"bsonType": "string"},
            "id_documento": {"bsonType": "string", "description": "Nota corregida."},
            "id_bloque": {"bsonType": "string", "description": "Celda pública a la que se refiere."},
            "tipo_bloque": {"enum": ["texto", "codigo", "animacion", "ejercicio"]},
            "tipo_error": {"enum": ["matematico", "codigo", "replicacion", "redaccion", "referencia"]},
            "fragmento": {"bsonType": "string", "description": "Cita opcional del pasaje exacto."},
            "descripcion": {"bsonType": "string", "minLength": 20, "maxLength": 2000},
            "autor": {
                "bsonType": "object",
                "required": ["id_usuario", "alias"],
                "properties": {
                    "id_usuario": {"bsonType": "string"},
                    "alias": {"bsonType": "string"},
                    "firma": {"bsonType": "string"},
                    "correo": {"bsonType": "string"}
                }
            },
            "estado": {"enum": ["abierta", "atendida", "descartada"]},
            "respuesta": {"bsonType": "string", "description": "Respuesta del autor de la nota."},
            "fecha_creacion": {"bsonType": "date"},
            "fecha_resolucion": {"bsonType": ["date", "null"]}
        }
    }
}

# Cuentas (antes en SQLite; ver usuarios/repositorio.py). La contraseña es el
# hash de Django; email_clave y alias_clave son el correo y el alias en
# minúsculas, con índice único.
esquema_usuario = {
    "$jsonSchema": {
        "bsonType": "object",
        "title": "Usuario",
        "required": ["id_usuario", "username", "email", "password", "email_clave", "alias_clave",
                     "is_active", "is_staff", "is_superuser"],
        "properties": {
            "id_usuario": {"bsonType": "string", "description": "Se conserva el id numérico de SQLite, como texto."},
            "username": {"bsonType": "string", "maxLength": 150},
            "email": {"bsonType": "string", "maxLength": 254},
            "email_clave": {"bsonType": "string"},
            "alias_clave": {"bsonType": "string"},
            "first_name": {"bsonType": "string", "maxLength": 150},
            "last_name": {"bsonType": "string", "maxLength": 150},
            "firma": {"enum": ["alias", "nombre"]},
            "password": {"bsonType": "string", "description": "Hash de Django (algoritmo$iteraciones$sal$hash)."},
            "is_active": {"bsonType": "bool"},
            "is_staff": {"bsonType": "bool"},
            "is_superuser": {"bsonType": "bool"},
            "date_joined": {"bsonType": ["date", "null"]},
            "last_login": {"bsonType": ["date", "null"]}
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

    # --- Gestión de la colección Correccion ---
    if "Correccion" not in colecciones_existentes:
        try:
            db.create_collection("Correccion", validator=esquema_correccion)
            print("Colección 'Correccion' creada exitosamente.")
        except Exception as e:
            print(f"Error al crear 'Correccion': {e}")
    else:
        actualizar_validador("Correccion", esquema_correccion)

    # --- Gestión de la colección Usuario ---
    if "Usuario" not in colecciones_existentes:
        try:
            db.create_collection("Usuario", validator=esquema_usuario)
            print("Colección 'Usuario' creada exitosamente.")
        except Exception as e:
            print(f"Error al crear 'Usuario': {e}")
    else:
        actualizar_validador("Usuario", esquema_usuario)

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

        # Índices de consulta: cada listado usa uno y no recorre la colección
        db['Nota'].create_index([("es_borrador", 1), ("fecha_publicacion", -1)])           # catálogo
        db['Nota'].create_index([("id_categoria", 1), ("es_borrador", 1), ("fecha_publicacion", -1)])  # por categoría
        db['Nota'].create_index("categorias_extra")  # filtro por categoría y bloqueo al eliminarla
        db['Nota'].create_index([("autor.id_usuario", 1), ("fecha_modificacion", -1)])     # Mis notas
        db['Nota'].create_index("prerrequisitos")                                          # «para seguir»
        db['Categoria'].create_index("padres")                                             # subcategorías

        db['Correccion'].create_index("id_correccion", unique=True)
        db['Correccion'].create_index([("id_documento", 1), ("estado", 1), ("fecha_creacion", -1)])
        db['Correccion'].create_index([("autor.id_usuario", 1), ("id_documento", 1), ("estado", 1)])

        # Portadas en WebP (categorias/imagenes.py)
        db['Imagen'].create_index("id_imagen", unique=True)

        # Cuentas y sesiones: los mismos que usuarios.repositorio.asegurar_indices()
        db['Usuario'].create_index("id_usuario", unique=True)
        db['Usuario'].create_index("email_clave", unique=True)
        db['Usuario'].create_index("alias_clave", unique=True)
        db['Usuario'].create_index([("is_staff", 1), ("is_active", 1)])
        db['Sesion'].create_index("jti", unique=True)
        db['Sesion'].create_index("id_usuario")
        # TTL: MongoDB borra cada sesión cuando vence su token de renovación,
        # sin comando flushexpiredtokens ni tarea programada.
        db['Sesion'].create_index("expira", expireAfterSeconds=0)

        print("Índices de unicidad y de consulta configurados con éxito en MongoDB Atlas.")
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

def completar_modelo_rediseno():
    """
    Rediseño de notas (nov. 2026), idempotente:
    - `celdas` (conteo para listados) y `revision` en cada nota;
    - `archivo` y `titulo` vacíos en cada celda;
    - `autor.firma` igual al alias (cada persona puede cambiarla en Mis datos).
    """
    actualizadas = 0
    for nota in db["Nota"].find({}):
        bloques = nota.get("bloques", [])
        cambios = {}
        if any("archivo" not in b or "titulo" not in b for b in bloques):
            bloques = [{"archivo": "", "titulo": "", **b} for b in bloques]
            cambios["bloques"] = bloques
        if "celdas" not in nota:
            publicas = [b for b in bloques if b.get("publico")]
            tipos = list(dict.fromkeys(b.get("tipo") for b in publicas))
            cambios["celdas"] = {"total": len(bloques), "publicas": len(publicas), "tipos_publicos": tipos}
        if "revision" not in nota:
            cambios["revision"] = 1
        if "firma" not in nota.get("autor", {}):
            cambios["autor.firma"] = nota.get("autor", {}).get("alias", "")
        if cambios:
            db["Nota"].update_one({"_id": nota["_id"]}, {"$set": cambios})
            actualizadas += 1
    print(f"Notas completadas con el modelo del rediseño: {actualizadas}")

if __name__ == "__main__":
    # Limpieza  de datos de prueba si es entorno de desarrollo
    # db['Categoria'].delete_many({}) 
    
    inicializar_colecciones()
    inicializar_indices()
    migrar_notas_a_bloques()
    completar_modelo_rediseno()