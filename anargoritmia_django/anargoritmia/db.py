import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi


load_dotenv()
uri = os.getenv("MONGO_URI")

if not uri:
    raise ValueError("Falla estructural: La variable MONGO_URI no está definida en el entorno.")

# Tiempos cortos: si Atlas no responde, la petición falla en ~5 s con un 503
# claro (ver anargoritmia/excepciones.py) en lugar de quedarse colgada 30 s.
client = MongoClient(
    uri,
    server_api=ServerApi('1'),
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
)

try:
    client.admin.command('ping')
    print("Conexión segura a MongoDB establecida. Credenciales protegidas.")
except Exception as e:
    print(f"Error de conexión a MongoDB (la API responderá 503 mientras dure): {e}")

db = client['Anargoritmia']
