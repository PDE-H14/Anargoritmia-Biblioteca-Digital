import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# 1. Carga las variables ocultas del archivo .env al entorno del sistema
load_dotenv()

# 2. Extrae la URI dinámicamente
uri = os.getenv("MONGO_URI")

# 3. Validación de seguridad para evitar fallos silenciosos
if not uri:
    raise ValueError("Falla estructural: La variable MONGO_URI no está definida en el entorno.")

# 4. Crea el cliente apuntando al clúster
client = MongoClient(uri, server_api=ServerApi('1'))

# 5. Confirmación de conexión
try:
    client.admin.command('ping')
    print("Conexión segura a MongoDB establecida. Credenciales protegidas.")
except Exception as e:
    print(f"Error de conexión: {e}")

# Instancia de la base de datos soberana
db = client['Anargoritmia']