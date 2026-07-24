import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi


load_dotenv()
uri = os.getenv("MONGO_URI")

if not uri:
    raise ValueError("Falla estructural: La variable MONGO_URI no está definida en el entorno.")

client = MongoClient(uri, server_api=ServerApi('1'))

try:
    client.admin.command('ping')
    print("Conexión segura a MongoDB establecida. Credenciales protegidas.")
except Exception as e:
    print(f"Error de conexión: {e}")

db = client['Anargoritmia']