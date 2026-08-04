# Registro de Pruebas de Integración HTTP — Módulo Notas API

**Sistema:** Anargoritmia — Biblioteca Digital  
**Componente:** `notas.api.views.NotaViewSet` / MongoDB Atlas 
**Controlador:** `rest_framework.viewsets.GenericViewSet`  
**Serializador:** `NotaSerializer`

---

## Resumen de Cobertura de Pruebas

| ID | Operación | Escenario de Prueba | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **00** | `POST` | Inicialización de payload básico (Estructura base) | HTTP 200 OK | HTTP 200 OK | **PASÓ** |
| **01** | `POST` | Creación exitosa con tipado consistente | HTTP 201 Created | HTTP 201 Created | **PASÓ** |
| **02** | `POST` | Rechazo por omisión de campos requeridos | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **03** | `POST` | Rechazo de tipos incorrectos (Booleanos/Fechas) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **04** | `POST` | Validación de integridad estructural mínima | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **05** | `POST` | Control de integridad referencial (Categoría inexistente) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **06** | `POST` | Renderizado de expresiones matemáticas en KaTeX ($\Psi$) | HTTP 201 Created | HTTP 201 Created | **PASÓ** |
| **07** | `POST` | Control de colisiones (Índice compuesto autor/ficha) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **—** | `PATCH` | Actualización parcial y recálculo dinámico de la `ficha` | HTTP 200 OK | HTTP 200 OK | **PASÓ** |
| **—** | `PUT` | Actualización total (Inmutabilidad del UUID lógico) | HTTP 200 OK | HTTP 200 OK | **PASÓ** |
| **—** | `DELETE`| Remoción física de la entidad del clúster | HTTP 204 No Content | HTTP 204 No Content | **PASÓ** |

---

## Desglose Detallado de Casos de Prueba

### 1. Inyección de Documentos y Renderizado KaTeX (`POST /api/notas/`)

#### Prueba 01: Creación Básica y Tipado de Datos
Se valida el comportamiento del serializador al recibir un payload estructurado completo con variables válidas.

```json
// Payload enviado
{
  "titulo": "Demostración del Teorema de Pitágoras",
  "autor": {
    "id_usuario": "usr_123",
    "alias": "damián",
    "correo": "user@example.com"
  },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "feda2fca-e491-4e96-8893-e8737e5127f2",
  "etiquetas": ["geometría", "euclidiana"],
  "contenido": "Contenido base",
  "espacio_interactivo": {
    "codigo_fuente": "",
    "librerias": [],
    "parametros_iniciales": {}
  },
  "es_borrador": true,
  "fecha_publicacion": "2026-08-04T00:06:32.794Z"
}
```
* **Respuesta:** `HTTP 201 Created`.

---

#### Prueba 06: Soporte de Notación Matemática KaTeX
Se verifica la persistencia de caracteres especiales y delimitadores matemáticos de LaTeX dentro del campo `contenido`.

```json
// Payload enviado
{
  "titulo": "Ecuación de Schrödinger",
  "autor": {
    "id_usuario": "usr_123",
    "alias": "pescamillah1800",
    "correo": "escamilla.huerta.porfirio@gmail.com"
  },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "684fbd73-470d-41a2-96d1-be5ef2d2bf55",
  "etiquetas": ["geometría", "euclidiana"],
  "contenido": "La ecuación dependiente del tiempo es $i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)$.",
  "es_borrador": true,
  "fecha_publicacion": "2026-08-04T00:06:32.794Z"
}
```
* **Respuesta:** `HTTP 201 Created`. El validador BSON de Atlas asimiló la cadena unicode sin alterar la sintaxis de escape.

---

### 2. Validaciones de Estructura y Reglas de Negocio

#### Prueba 03: Validación de Booleanos y Fechas (Tipado Incorrecto)
Se somete a prueba la robustez del serializador ante tipos de datos incompatibles.

```json
// Payload enviado
{
  "titulo": "Prueba de tipado",
  "autor": {
    "id_usuario": "usr_123",
    "alias": "damián",
    "correo": "user@example.com"
  },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "feda2fca-e491-4e96-8893-e8737e5127f2",
  "etiquetas": ["geometría", "euclidiana"],
  "contenido": "Contenido base",
  "es_borrador": "verdadero",
  "fecha_publicacion": "hoy"
}
```
* **Respuesta:** `HTTP 400 Bad Request`.
* **Detalle del error devuelto por DRF:**
  ```json
  {
    "es_borrador": ["Debe ser un booleano válido."],
    "fecha_publicacion": ["Fecha/hora con formato erróneo. Use uno de los siguientes formatos en su lugar: YYYY-MM-DDThh:mm[:ss[.uuuuuu]][+HH:MM|-HH:MM|Z]."]
  }
  ```

---

#### Prueba 05: Control de Integridad Referencial
El serializador realiza una búsqueda previa en la colección `Categoria` para asegurar que el documento científico se asocie a una taxonomía válida y preexistente.

```json
// Payload enviado
{
  "titulo": "Prueba de tipado",
  "autor": { "id_usuario": "usr_123", "alias": "damián" },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "uuid-falso-o-inexistente",
  "contenido": "Contenido base"
}
```
* **Respuesta:** `HTTP 400 Bad Request`.
* **Cuerpo de Respuesta:**
  ```json
  {
    "id_categoria": [
      "Violación de integridad: La categoría especificada no existe."
    ]
  }
  ```

---

### 3. Prueba de Control de Unicidad y Colisiones (Prueba 07)

Se valida la integridad atómica de la base de datos ante intentos de duplicación semántica bajo el mismo usuario [11].

```json
// Segundo envío del mismo título por parte del autor ("1")
{
  "titulo": "Ecuación de Schrödinger",
  "autor": {
    "id_usuario": "1",
    "alias": "pescamillah1800"
  },
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "01cc81af-137e-42a1-8991-1b937e69b399",
  "contenido": "La ecuación dependiente del tiempo..."
}
```
* **Respuesta:** `HTTP 400 Bad Request`.
* **Cuerpo de Respuesta:**
  ```json
  {
    "error": "Conflicto de entidad: Ya tienes una nota registrada con este título o ficha."
  }
  ```

---

### 4. Ciclo Completo de Mantenimiento CRUD

#### A. Actualización Parcial (`PATCH /api/notas/{id_documento}/`)
Se modifica el título del documento `d54e26df-ef54-4fe4-a5f0-6728a55181e1`. El sistema calcula la nueva `ficha` de enrutamiento web y genera la marca de tiempo.

```json
// Payload enviado
{
  "titulo": "Mutación & Reemplazo",
  "etiquetas": ["Bienvenido", "al", "himalaya"],
  "es_borrador": false
}
```
* **Respuesta:** `HTTP 200 OK`.
* **Documento resultante en Atlas (BSON):**
  ```json
  {
    "_id": "6a716c2aa058cc970de21fbb",
    "id_documento": "d54e26df-ef54-4fe4-a5f0-6728a55181e1",
    "titulo": "Mutación & Reemplazo",
    "ficha": "mutacion-reemplazo",
    "licencia": "CC BY-SA 4.0",
    "id_categoria": "01cc81af-137e-42a1-8991-1b937e69b399",
    "etiquetas": ["Bienvenido", "al", "himalaya"],
    "contenido": "La ecuación dependiente del tiempo es...",
    "es_borrador": false,
    "fecha_publicacion": "2026-08-04T04:51:10.842000",
    "autor": {
      "id_usuario": "1",
      "alias": "pescamillah1800",
      "correo": "escamilla.huerta.porfirio@gmail.com"
    }
  }
  ``` 

---

#### B. Actualización Total / Reemplazo (`PUT /api/notas/{id_documento}/`)
Se intenta sobreescribir la entidad. El sistema intercepta el payload para garantizar la inmutabilidad de la clave primaria lógica (`id_documento`).

```json
// Payload enviado (Intento de mutar id_documento a "d54e26df-ef54-4fe4-a5f0-6728a55181e1-x")
{
  "titulo": "Reemplazo",
  "licencia": "CC BY-SA 4.0",
  "id_categoria": "01cc81af-137e-42a1-8991-1b937e69b399",
  "etiquetas": ["Bienvenido", "al", "himalaya", "Y", "mas-alla"],
  "contenido": "La ecuación dependiente del tiempo es...",
  "espacio_interactivo": null,
  "es_borrador": false,
  "fecha_publicacion": "2026-08-04T04:51:10.842000Z",
  "id_documento": "d54e26df-ef54-4fe4-a5f0-6728a55181e1-x",
  "autor": {
    "id_usuario": "1",
    "alias": "pescamillah1800"
  }
}
```
* **Respuesta:** `HTTP 200 OK`.
* **Resultado:** El campo `id_documento` de la entidad persistida permaneció inmutable en `"d54e26df-ef54-4fe4-a5f0-6728a55181e1"`, ignorando la alteración enviada por el cliente.

---

#### C. Eliminación (`DELETE /api/notas/{id_documento}/`)
* **Respuesta:** `HTTP 204 No Content`. El registro se remueve físicamente del clúster de base de datos de manera atómica.

---

## Conclusión Técnica

El conjunto de pruebas lógicas aplicadas al controlador `NotaViewSet` demuestra un comportamiento robusto en todas sus fronteras de validación. La capa de Django REST Framework procesa y rechaza con exactitud los desbordamientos de datos de tiempo y estado booleano, garantiza la validez de las relaciones lógicas con la colección `Categoria`, y se mantiene como un filtro infranqueable frente a la duplicación de títulos o colisiones redundantes para un mismo autor. Asimismo, se verifica la persistencia exacta de texto Markdown e instrucciones KaTeX, pavimentando el camino para un renderizado dinámico transparente en el lado del cliente React.
