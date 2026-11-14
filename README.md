# 🌻 Anargoritmia: Biblioteca Digital

> **Infraestructura web soberana y de acceso abierto para la centralización, procesamiento interactivo y liberación de la producción científica de la Licenciatura en Matemática Algorítmica (ESFM - IPN).**

[![Contenido: CC BY-SA 4.0](https://img.shields.io/badge/Contenido-CC%20BY--SA%204.0-yellow.svg)](https://creativecommons.org/licenses/by-sa/4.0/deed.es)
[![Código: AGPL-3.0](https://img.shields.io/badge/C%C3%B3digo-AGPL--3.0-blue.svg)](LICENSE)
[![Stack: Django + React + MongoDB](https://img.shields.io/badge/Stack-Django%20%7C%20React%20%7C%20MongoDB-006600.svg)](#-arquitectura-y-pila-tecnológica)
[![Idioma: Español Nativo](https://img.shields.io/badge/Idioma-Español%20Nativo-red.svg)](#-análisis-crítico-y-posicionamiento-materialista)
[![Copyleft: Inalienable](https://img.shields.io/badge/Copyleft-Garantizado-blue.svg)](#-licenciamiento-y-soberanía)

---

## 🚩 Análisis Crítico y Posicionamiento

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

* 📝 **Notas como cuadernos de celdas:** texto (Markdown + KaTeX), código con lenguaje, versión y notas de replicación, animaciones y ejercicios con pista y solución plegables. Cada celda es pública o privada, y la nota se autoguarda.
* 🔬 **Textos de investigación:** tablas, notas al pie, cajas de teoremas, definiciones y demostraciones (`:::teorema[Nombre]{#id}`), numeración en toda la nota, referencias cruzadas (`[](#id)` → «Teorema 2») y bibliografía (`:::referencias` y `[@clave]`).
* ⚙️ **Animaciones aisladas:** JavaScript con Anime.js 4 dentro de un `iframe` con `sandbox="allow-scripts"` y una CSP que no deja conectarse a nada. Nada se ejecuta al abrir la nota: el lector pulsa «Reproducir» y puede mover deslizadores (`parametro()`).
* 🖼️ **Figuras generadas con código:** una celda de animación marcada como figura guarda el SVG que dibujó en el taller del autor; el lector ve una imagen fija con los colores del tema, sin ejecutar nada.
* 🗂️ **Catálogo jerárquico:** categorías en árbol (con varios padres posibles), categorías extra, etiquetas, búsqueda sin acentos y paginación.
* 🕸️ **Red del procomún:** grafo de todas las notas, agrupadas por categoría, con sus rutas de estudio («se lee antes de») y derivaciones, al estilo de Obsidian; búsqueda, ficha de cada nota y red local numerada en el margen de la lectura. El servidor impide los ciclos en las rutas.
* 🤝 **Procomún:** cualquiera con cuenta propone correcciones sobre una celda concreta, y deriva su propia versión de una nota con la atribución que exige la licencia.
* 🖨️ **Impresión y PDF:** cada nota se imprime sola, en colores claros, con demostraciones y (opcionalmente) soluciones abiertas y con la forma de citarla.
* 📣 **Avisos de la administración:** novedades, mantenimientos, notas importantes y reconocimientos, con vigencia, en una banda del sitio o del taller y en la página «Novedades».
* 🛡️ **Cuentas y permisos:** registro abierto con límite por IP real, sesiones JWT revocables, un admin no puede modificar a otro, y borrar la cuenta anonimiza lo publicado (derecho al olvido).
* 📑 **Licenciamiento automático:** cada nota publicada lleva CC BY-SA 4.0.

---

## 🛠️ Arquitectura y Pila Tecnológica

El sistema utiliza una arquitectura desacoplada (*Single Page Application* + API REST) alimentada por un motor BSON no relacional. No hay base SQL: cuentas, sesiones e imágenes también viven en MongoDB.

<pre><code>
┌──────────────────────────────────────┐
│   Cliente React (SPA, Cloudflare)    │
│ - Markdown + KaTeX + GFM + cajas     │
│ - Animaciones en iframe aislado      │
│ - Red de conocimiento (SVG)          │
└──────────────────┬───────────────────┘
                   │ HTTPS · JSON · JWT
                   ▼
┌──────────────────────────────────────┐
│   API REST (Django / DRF, Render)    │
│ - Permisos, validación y límites     │
│ - Solo JSON (sin ORM)                │
└──────────────────┬───────────────────┘
                   │ PyMongo
                   ▼
┌──────────────────────────────────────┐
│        MongoDB Atlas (BSON)          │
│ - Nota, Categoria, Correccion,       │
│   Usuario, Sesion, Imagen, Aviso,    │
│   Contador                           │
│ - Índices únicos y validadores       │
└──────────────────────────────────────┘
</code></pre>

| Capa | Tecnología | Función Material |
| :--- | :--- | :--- |
| **Frontend** | React 18 (CRA, Yarn 1), react-markdown, remark-gfm, remark-math, remark-directive, KaTeX, Anime.js 4.5 | Interfaz, renderizado matemático local, cajas y referencias, animaciones aisladas y grafo. |
| **Backend** | Python 3.13, Django 6, Django REST Framework, SimpleJWT, PyMongo, gunicorn | API REST, validación, permisos, límites de peticiones y sesiones. |
| **Base de Datos** | MongoDB Atlas | Almacenamiento BSON con validadores `$jsonSchema` e índices únicos. |
| **Seguridad** | JWT con sesiones revocables, CORS, CSP en el sandbox | Aislamiento de sesiones, de origen cruzado y del código de los autores. |
| **Despliegue** | Render (API) y Cloudflare Pages (cliente), capas gratuitas | Ver [DESPLIEGUE.md](DESPLIEGUE.md). |

---

## 🗄️ Esquema BSON de la Base de Datos

Los validadores completos están en `anargoritmia_django/anargoritmia/setup_db.py`.

### Colección: `Nota`

<pre><code>
{
  "id_documento": "UUID",
  "titulo": "String",
  "ficha": "String (dirección legible, única por autor)",
  "autor": { "id_usuario": "String", "alias": "String", "firma": "String", "correo": "String (nunca se publica)" },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "UUID",
  "categorias_extra": ["UUID (máx. 3)"],
  "etiquetas": ["String (máx. 10)"],
  "prerrequisitos": ["id_documento (máx. 5, sin ciclos)"],
  "origen": { "id_documento": "…", "titulo": "…", "firma": "…" } | null,
  "bloques": [
    {
      "id": "String", "tipo": "texto | codigo | animacion | ejercicio", "publico": "Boolean",
      "contenido": "Markdown + KaTeX, código o JS de Anime.js",
      "titulo": "…", "archivo": "…", "lenguaje": "…", "version": "…", "notas": "…",
      "pista": "…", "solucion": "…",
      "figura": "Boolean", "svg": "SVG (máx. 200 KB)", "svg_codigo": "huella"
    }
  ],
  "contenido": "Texto público derivado (búsqueda)",
  "celdas": { "total": "Int", "publicas": "Int", "tipos_publicos": ["…"] },
  "revision": "Int (control de concurrencia)",
  "es_borrador": "Boolean",
  "fecha_publicacion": "Date | null",
  "fecha_modificacion": "Date"
}
</code></pre>

### Otras colecciones

| Colección | Contenido |
| :--- | :--- |
| `Categoria` | Nombre, ficha, descripción, padres (árbol con varios padres), portada y punto de enfoque. |
| `Correccion` | Propuesta sobre una celda: tipo de error, descripción, estado y autor. |
| `Usuario` | Alias, correo, nombre opcional, firma elegida, contraseña con hash y rol. |
| `Sesion` | Sesiones abiertas (JWT revocables) con caducidad automática. |
| `Imagen` | Portadas de categoría en WebP. |
| `Aviso` | Avisos de la administración: tipo, texto, vigencia, lugares, fijado y cerrable. |
| `Contador` | Secuencias (identificadores de usuario). |

---

## 🚀 Instalación y Configuración Local

### 1. Servidor (Django)

```bash
git clone https://github.com/PDE-H14/Anargoritmia-Biblioteca-Digital.git
cd Anargoritmia-Biblioteca-Digital/anargoritmia_django
python -m venv envs/anargoritmia
envs\anargoritmia\Scripts\activate        # en Linux o macOS: source envs/anargoritmia/bin/activate
pip install -r requirements.txt
```

Crea `anargoritmia_django/anargoritmia/.env`:

```
SECRET_KEY=una_clave_larga_de_desarrollo
DEBUG=True
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/?retryWrites=true&w=majority
```

Inicializa la base y crea tu cuenta de administración:

```bash
cd anargoritmia
python setup_db.py                          # validadores e índices; no borra datos
python manage.py crear_admin --email tu@correo.mx --alias tu_alias
python manage.py runserver
```

### 2. Cliente (React)

```bash
cd anargoritmia_react
yarn install
```

Crea `anargoritmia_react/.env` con `REACT_APP_BASE_API=http://localhost:8000` y arranca con `yarn start`.

### 3. Pruebas

```bash
cd anargoritmia_django/anargoritmia
python manage.py test        # usa una base en memoria (mongomock), no toca Atlas
```

### Comandos de administración

| Comando | Para qué |
| :--- | :--- |
| `crear_admin --email … --alias …` | Crea una cuenta de administración (o `--promover` una existente). |
| `quitar_admin --alias …` | Le quita el rol a un admin; desde el panel, un admin no puede tocar a otro. |
| `respaldar_mongo` | Copia toda la base a `respaldos/` (JSON extendido e índices). |
| `migrar_portadas` | Lleva las portadas de categoría de archivos a la colección `Imagen`. |

---

## 🧪 Matriz de Endpoints

La API responde solo JSON y tiene documentación interactiva en `/doc/`.

| Método y ruta | Acceso | Qué hace |
| :--- | :--- | :--- |
| `POST /api/auth/registro/` | Público (10/h por IP) | Alta de cuenta, nunca de administración. |
| `POST /api/auth/login/` · `renovar/` · `salir/` | Público / sesión | Sesiones JWT. |
| `GET · PATCH · DELETE /api/auth/me/` | Sesión | Mis datos; borrar la cuenta anonimiza lo publicado. |
| `GET /api/notas/` | Público | Catálogo (`?categoria=`, `?q=`, `?limite=`). |
| `GET /api/notas/grafo/` | Público | Red del procomún: notas publicadas con prerrequisitos y origen (`?borradores=1` agrega los propios). |
| `GET /api/notas/{id}/` | Público / autor | Lectura (solo celdas públicas para lectores). |
| `GET /api/notas/mias/` | Sesión | Mis notas, con borradores. |
| `POST · PATCH · DELETE /api/notas/…` | Autor | Crear, editar y borrar notas. |
| `POST /api/notas/{id}/derivar/` | Sesión | Versión propia con atribución. |
| `GET · POST /api/notas/{id}/correcciones/` | Sesión | Correcciones sobre una celda. |
| `GET /api/categorias/` | Público | Árbol de categorías. |
| `POST · PATCH · DELETE /api/categorias/…` | Admin | Gestión de categorías y portadas. |
| `GET /api/avisos/?lugar=publico\|taller` | Público | Avisos vigentes; el primero va en la banda. |
| `GET /api/avisos/historial/` | Público | Novedades publicadas. |
| `GET /api/avisos/todos/` · `POST · PATCH · DELETE /api/avisos/…` | Admin | Gestión de avisos. |
| `/api/usuarios/…` | Admin | Gestión de cuentas (sin tocar a otros admins). |

---

## ⚖️ Licenciamiento y Soberanía

* **Contenido y Producción Científica:** distribuidos inalienablemente bajo la licencia [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.es).
* **Código Fuente del Software:** GNU Affero General Public License v3.0 (AGPL-3.0); el texto completo está en el archivo [LICENSE](LICENSE). Es copyleft también para quien ofrezca el sistema modificado como servicio web: debe publicar sus cambios, de modo que los medios de producción continúen perteneciendo a la comunidad estudiantil.

> *Omnia sunt communia!* (¡Todo es de todos!)
