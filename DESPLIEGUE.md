# Guía de despliegue

Anargoritmia se despliega en tres servicios gratuitos, sin tarjeta:

| Pieza | Servicio | Dirección resultante |
|---|---|---|
| Base de datos | MongoDB Atlas (ya existe) | — |
| Servidor (Django) | Render, plan Free | `https://<servidor>.onrender.com` |
| Cliente (React) | Cloudflare Pages | `https://<cliente>.pages.dev` |

El orden importa: primero el servidor, porque el cliente necesita su dirección; luego el cliente; al final se le dice al servidor qué cliente puede llamarlo.

Tiempo estimado: una hora, la mayor parte esperando a que compilen.

---

## 0. Antes de empezar

- [ ] **Sube los cambios a GitHub.** Render y Cloudflare leen el código desde el repositorio, no desde tu computadora. Los cambios de producción (`settings.py` y `gunicorn` en `requirements.txt`) deben estar en `main`:

  ```bash
  git push origin main
  ```

- [ ] **Genera una clave secreta nueva para producción** (no reutilices la de tu `.env` local):

  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(50))"
  ```

  Guárdala en un lugar seguro; la vas a pegar en Render. No la subas al repositorio ni la compartas.

- [ ] **Ten a mano tu `MONGO_URI`**, la misma de `anargoritmia_django/anargoritmia/.env`.

- [ ] **Saca un respaldo de la base**, por si acaso (desde `anargoritmia_django/anargoritmia`, con tu entorno activado):

  ```bash
  python manage.py respaldar_mongo
  ```

---

## 1. MongoDB Atlas: permitir conexiones desde Render

Render gratuito no tiene una dirección IP fija, así que Atlas tiene que aceptar conexiones de cualquier origen. La protección queda en el usuario y la contraseña de la cadena de conexión.

1. En [cloud.mongodb.com](https://cloud.mongodb.com), entra a **Network Access** (o **Security → Network Access**).
2. **Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`) → **Confirm**.
3. Deja también la entrada de tu red de casa, si la tienes.

> **Revisa antes:** que el usuario de `MONGO_URI` (PruebaTron) tenga solo `readWrite` y ya no `dbAdmin`, y que su contraseña sea larga y aleatoria. Con el acceso abierto, esa contraseña es la única puerta.

---

## 2. Render: el servidor Django

### 2.1 Crear el servicio

1. Entra a [render.com](https://render.com) y regístrate **con tu cuenta de GitHub** (no pide tarjeta).
2. **New → Web Service** → elige el repositorio `Anargoritmia-Biblioteca-Digital`. Si no aparece, pulsa **Configure account** y dale acceso a ese repositorio.
3. Llena el formulario:

| Campo | Valor |
|---|---|
| **Name** | `anargoritmia-api` (o el que quieras; define la dirección `https://anargoritmia-api.onrender.com`) |
| **Region** | La más cercana a tu cluster de Atlas (Atlas muestra la región en *Clusters*; si es `us-east-1`, elige *Virginia*; si es `us-west`, *Oregon*) |
| **Branch** | `main` |
| **Root Directory** | `anargoritmia_django` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn --chdir anargoritmia anargoritmia.wsgi:application --bind 0.0.0.0:$PORT` |
| **Instance Type** | `Free` |

### 2.2 Variables de entorno

En la misma página, en **Environment Variables** (o después, en la pestaña **Environment**):

| Variable | Valor |
|---|---|
| `PYTHON_VERSION` | `3.13.14` (la misma que usas en local; si Render dice que no la tiene, usa la 3.13 más reciente que ofrezca) |
| `SECRET_KEY` | La clave que generaste en el paso 0 |
| `DEBUG` | `False` |
| `MONGO_URI` | Tu cadena de Atlas, completa |
| `CORS_ORIGENES` | Déjala vacía por ahora; se llena en el paso 4 |

No hace falta poner `ALLOWED_HOSTS`: Render define sola la variable `RENDER_EXTERNAL_HOSTNAME` con tu dirección `.onrender.com`, y `settings.py` la agrega. Solo la usarías si después conectas un dominio propio.

### 2.3 Desplegar y comprobar

1. Pulsa **Deploy Web Service**. La primera compilación tarda unos minutos.
2. En **Logs**, al final deberías ver algo como:
   ```
   Conexión segura a MongoDB establecida. Credenciales protegidas.
   [INFO] Listening at: http://0.0.0.0:10000
   ```
3. Abre en el navegador `https://anargoritmia-api.onrender.com/api/categorias/`. Debe responder una lista JSON con tus categorías.
4. Abre una portada: copia de esa lista una `imagen_portada`. Debe empezar con **`https://`**, no `http://`.

> **El servidor se duerme.** En el plan gratuito, Render apaga el servicio tras 15 minutos sin visitas. La primera petición después de eso tarda entre 30 segundos y un minuto mientras despierta; las siguientes son normales. No es un error.

> **La documentación de la API** (`/doc/`) se verá sin estilos en producción, porque con `DEBUG=False` Django no sirve sus archivos estáticos. La API funciona igual; la documentación completa sigue disponible en local.

---

## 3. Cloudflare Pages: el cliente React

### 3.1 Crear el proyecto

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) y crea una cuenta gratuita.
2. **Workers & Pages → Create → Pages → Connect to Git** → autoriza GitHub y elige el repositorio.
3. Llena la configuración de compilación:

| Campo | Valor |
|---|---|
| **Project name** | `anargoritmia` (define la dirección `https://anargoritmia.pages.dev`; si está ocupado, elige otro) |
| **Production branch** | `main` |
| **Framework preset** | `Create React App` |
| **Build command** | `yarn build` |
| **Build output directory** | `build` |
| **Root directory** (en *Advanced*) | `anargoritmia_react` |

### 3.2 Variables de entorno

En **Environment variables** (también en *Advanced*):

| Variable | Valor |
|---|---|
| `REACT_APP_BASE_API` | `https://anargoritmia-api.onrender.com` (tu dirección de Render, **sin** `/` al final) |
| `NODE_VERSION` | `24.18.0` (la misma que usas en local) |

> `REACT_APP_BASE_API` se graba en el código al compilar. Si después la cambias, hay que volver a desplegar (**Deployments → Retry deployment**) para que tome el valor nuevo.

### 3.3 Desplegar

1. **Save and Deploy**. Cloudflare instala dependencias y compila; tarda unos minutos.
2. Cloudflare compila con `CI=true`, que convierte cualquier advertencia en error. El código actual compila limpio; si algún día falla con *Treating warnings as errors*, lee la advertencia en el registro y corrígela.
3. Al terminar, abre `https://anargoritmia.pages.dev`. La portada debe cargar, pero el catálogo todavía fallará: el servidor aún no acepta peticiones de esta dirección. Eso se arregla en el paso 4.

Las rutas como `/notas/<id>` o `/lab` funcionan al recargar sin configurar nada: si el proyecto no tiene un `404.html`, Cloudflare Pages lo trata como una aplicación de una sola página y responde siempre con `index.html`.

---

## 4. Conectar el servidor con el cliente

1. En Render, pestaña **Environment**, pon:

   | Variable | Valor |
   |---|---|
   | `CORS_ORIGENES` | `https://anargoritmia.pages.dev` |

   Exactamente la dirección de Cloudflare: con `https://`, sin `/` al final. Si tienes varias (por ejemplo, un dominio propio), sepáralas con comas.
2. **Save Changes**. Render vuelve a desplegar solo; espera a que termine.
3. Recarga `https://anargoritmia.pages.dev`: el catálogo ya debe cargar.

---

## 5. Prueba completa

Hazla con las herramientas del navegador abiertas (**F12 → Consola** y **Red**) para ver cualquier error rojo.

- [ ] La portada y el catálogo cargan, con las portadas de categoría visibles.
- [ ] Elegir una categoría muestra sus subcategorías y sus notas.
- [ ] El buscador encuentra una nota.
- [ ] Una nota se lee con las ecuaciones compuestas y la animación se reproduce.
- [ ] Recargar la página estando dentro de una nota no da error 404.
- [ ] Iniciar sesión con tu cuenta funciona.
- [ ] Crear una nota de prueba en el taller se guarda sola; publicarla la muestra en el catálogo. Después bórrala.
- [ ] Proponer una corrección (con otra cuenta) llega al autor.
- [ ] Crear una cuenta nueva desde **Registro** funciona. Bórrala después desde *Usuarios*.
- [ ] Cerrar sesión funciona.

---

## 6. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Render: `RuntimeError: SECRET_KEY no está definida` | Falta la variable | Agrega `SECRET_KEY` en *Environment* |
| Render: `Bad Request (400)` al abrir la API | El dominio no está en `ALLOWED_HOSTS` | Con `.onrender.com` no debería pasar; con un dominio propio, agrégalo a `ALLOWED_HOSTS` |
| Render: `ServerSelectionTimeoutError` o respuestas 503 | Atlas rechaza la conexión | Revisa el paso 1 (`0.0.0.0/0`) y que `MONGO_URI` sea correcta |
| Render: `Authentication failed` en los logs | Usuario o contraseña de `MONGO_URI` | Copia otra vez la cadena; codifica los símbolos de la contraseña (`$` → `%24`, `@` → `%40`) |
| Consola del navegador: error de **CORS** | `CORS_ORIGENES` no coincide | Debe ser idéntica a la barra de direcciones: `https://`, sin `/` final |
| Portadas que no cargan; consola: *Mixed Content* | La URL salió con `http://` | Revisa que el servicio esté en Render (define `RENDER=true`); en otro proveedor, pon `DETRAS_DE_PROXY=True` |
| El catálogo tarda casi un minuto la primera vez | El servidor estaba dormido | Normal en el plan gratuito |
| Cloudflare: el sitio llama a `127.0.0.1` | Falta `REACT_APP_BASE_API` | Agrégala y vuelve a desplegar |
| Cloudflare: *Treating warnings as errors* | Una advertencia de ESLint | Corrígela en el código y sube el cambio |

---

## 7. Después del despliegue

- **Despliegues automáticos.** Cada `git push` a `main` vuelve a desplegar los dos servicios.
- **Respaldos.** La base sigue viviendo solo en Atlas. Corre `python manage.py respaldar_mongo` en local de vez en cuando; los archivos quedan en `respaldos/`, fuera del repositorio.
- **Límites a vigilar.** Render: 750 horas al mes y 5 GB de salida; si se acaba la salida, el servicio se suspende hasta el mes siguiente. Atlas: 512 MB. Cloudflare Pages: 500 compilaciones al mes, sin límite de transferencia para el cliente.
- **Dominio propio** (opcional). Se conecta en Cloudflare (*Custom domains*) y en Render (*Settings → Custom Domains*). Después agrégalo a `CORS_ORIGENES` y, el de la API, a `ALLOWED_HOSTS`.
