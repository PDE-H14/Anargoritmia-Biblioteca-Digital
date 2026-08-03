# 🌻 Anargoritmia: Biblioteca Digital

> **Infraestructura web soberana y de acceso abierto para la centralización, procesamiento interactivo y liberación de la producción científica de la Licenciatura en Matemática Algorítmica (ESFM - IPN).**

[![Licencia: CC BY-SA 4.0](https://img.shields.io/badge/Licencia-CC%20BY--SA%204.0-yellow.svg)](https://creativecommons.org/licenses/by-sa/4.0/deed.es)
[![Stack: Django + React + MongoDB](https://img.shields.io/badge/Stack-Django%20%7C%20React%20%7C%20MongoDB-006600.svg)](#-arquitectura-y-pila-tecnológica)
[![Idioma: Español Nativo](https://img.shields.io/badge/Idioma-Español%20Nativo-red.svg)](#-análisis-crítico-y-posicionamiento-materialista)
[![Copyleft: Inalienable](https://img.shields.io/badge/Copyleft-Garantizado-blue.svg)](#-licenciamiento-y-soberanía)

---

## 🚩 Análisis Crítico y Posicionamiento Materialista

La producción científica de los estudiantes de ciencias exactas enfrenta una contradicción estructural: el **abandono académico**, la **fragmentación de los recursos de estudio** y la **expropiación burocrática del trabajo intelectual** mediante cartas de cesión de derechos. 

Frente a la privatización del conocimiento impuesta por monopolios corporativos (*LeetCode*, *Khan Academy*) y repositorios que imponen el inglés como filtro de exclusión (*Algorithm Archive*, *arXiv*), **Anargoritmia** se erige como una herramienta de resistencia y producción social.

<pre><code>
[ Expropiación Burocrática ]       [ Muros de Pago Corporativos ]
[ Monopolio Lingüístico    ]       [ Telemetría y Caja Negra    ]
              \                                     /
               \                                   /
                ▼                                 ▼
=================================================================
           🌻 ANARGORITMIA: BIBLIOTECA DIGITAL SOBERANA
=================================================================
                │                                 │
                ▼                                 ▼
[ Autonomía en Español     ]       [ Copyleft CC BY-SA 4.0      ]
[ Renderizado KaTeX        ]       [ Sandbox Interactivo        ]
</code></pre>

### ⚡ Principios Rectores:
1. **Soberanía del Código y los Datos:** Recuperación de los medios de producción tecnológica en manos estudiantiles.
2. **Autonomía Lingüística:** Desarrollo nativo en español para romper la hegemonía del Norte Global.
3. **Distribución Copyleft:** Inalienabilidad del conocimiento matemático bajo la licencia **CC BY-SA 4.0**.
4. **Pedagogía Problematizadora:** Transición de la lectura pasiva a la experimentación activa mediante entornos interactivos.

---

## ✨ Características Principales

* 📝 **Motor de Redacción Científica:** Soporte nativo para Markdown con notación matemática renderizada al vuelo mediante KaTeX (`$$\hat{H}\Psi = E\Psi$$`).
* ⚙️ **Espacio Interactivo (*Sandbox* Aislado):** Ejecución de animaciones y simulaciones matemáticas en tiempo real (`Anime.js` / React) bajo un entorno seguro en el cliente.
* 🛡️ **Autenticación Soberana:** Protección de endpoints mediante tokens JWT (SimpleJWT) con control de acceso basado en roles (`IsAdminUser`).
* 🗂️ **Taxonomía Dinámica:** Clasificación flexible BSON para alojar estructuras de datos heterogéneas (apuntes, códigos, simulaciones).
* 📑 **Licenciamiento Automatizado:** Sello inalienable de Copyleft inyectado automáticamente en cada documento publicado.

---

## 🛠️ Arquitectura y Pila Tecnológica

El sistema utiliza una arquitectura desacoplada (*Single Page Application* + API REST) alimentada por un motor BSON no relacional.

<pre><code>
┌─────────────────────────────────┐
│       Cliente React (SPA)       │
│ - Renderizado KaTeX / Markdown  │
│ - Sandbox Interactivo (Iframe)  │
└───────────────┬─────────────────┘
                │ Peticiones HTTP / JWT
                ▼
┌─────────────────────────────────┐
│     API REST (Django / DRF)     │
│ - Gestión Lógica & Permisos     │
│ - Serialización de Datos        │
└───────────────┬─────────────────┘
                │ Driver PyMongo
                ▼
┌─────────────────────────────────┐
│      MongoDB Atlas (BSON)       │
│ - Colecciones: Nota, Categoria  │
│ - Índices Únicos & Validadores  │
└─────────────────────────────────┘
</code></pre>

| Capa | Tecnología | Función Material |
| :--- | :--- | :--- |
| **Frontend** | React, KaTeX, Anime.js | Interfaz dinámica, renderizado matemático local y sandbox. |
| **Backend** | Python 3.12, Django REST | API REST, procesamiento asíncrono y control de acceso. |
| **Base de Datos** | MongoDB Atlas | Almacenamiento no relacional BSON con esquemas flexibles. |
| **Seguridad** | SimpleJWT, CORS Headers | Aislamiento de sesiones y protección de origen cruzado. |

---

## 🗄️ Esquema BSON de la Base de Datos

### Colección: `Nota` (Validador `$jsonSchema`)

```json
{
  "id_documento": "UUID (String v4)",
  "titulo": "String",
  "autor": {
    "id_usuario": "String",
    "alias": "String",
    "correo": "String"
  },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "UUID (String v4)",
  "etiquetas": ["String"],
  "contenido": "Cadena monolítica en Markdown + KaTeX",
  "espacio_interactivo": {
    "codigo_fuente": "String (JS/JSX)",
    "librerias": ["animejs"],
    "parametros_iniciales": { "clave": "valor" }
  },
  "es_borrador": "Boolean",
  "fecha_publicacion": "Date / Null"
}
🚀 Instalación y Configuración Local
1. Clonar el repositorio y aislar el entorno
git clone https://github.com/PDE-H14/Anargoritmia-Biblioteca-Digital.git
cd Anargoritmia-Biblioteca-Digital/anargoritmia_django
python -m venv venv
source .venv/bin/activate  # En Windows: .venv\anargoritmia\Scripts\activate
pip install -r requirements.txt
2. Configurar variables de entorno (.env)
Crea un archivo .env en la raíz de anargoritmia_django/:
SECRET_KEY=tu_clave_secreta_de_desarrollo
DEBUG=True
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/anargoritmia_db?retryWrites=true&w=majority
3. Inicializar Esquemas e Índices de Unicidad en MongoDB
python setup_db.py
4. Levantar el servidor de desarrollo
python manage.py runserver
🧪 Matriz de Endpoints y Verificación HTTP
La API cuenta con documentación interactiva en OpenAPI / Swagger en la ruta /doc/.
GET    /api/categorias/          --> Consulta pública de taxonomías
POST   /api/categorias/          --> Creación de categoría (Requiere JWT)
PUT    /api/categorias/{ficha}/  --> Actualización total (Requiere JWT)
PATCH  /api/categorias/{ficha}/  --> Actualización parcial (Requiere JWT)
DELETE /api/categorias/{ficha}/  --> Eliminación física (Requiere JWT)

GET    /api/notas/               --> Consulta de notas públicas (es_borrador: false)
POST   /api/notas/               --> Inyección de nota científica + Sandbox (Requiere JWT)
⚖️ Licenciamiento y Soberanía
Contenido y Producción Científica: Distribuidos inalienablemente bajo la licencia Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)
.
Código Fuente del Software: Liberado bajo principios de Software Libre (Copyleft) para garantizar que los medios de producción continúen perteneciendo a la comunidad estudiantil
.
  Omnia sunt communia! (¡Todo es de todos!)