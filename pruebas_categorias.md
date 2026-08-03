# Registro de Pruebas de Integración HTTP — Módulo Categorías API

**Sistema:** Anargoritmia — Biblioteca Digital  
**Componente:** `categorias.api.views.CategoriaViewSet` / MongoDB Atlas  
**Controlador:** `rest_framework.viewsets.GenericViewSet`  
**Serializador:** `CategoriaSerializer`

---

## Resumen de Cobertura de Pruebas

| ID | Operación | Escenario de Prueba | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **01-05** | `POST` | Creación básica y generación de *slug* / *ficha* | HTTP 201 Created | HTTP 201 Created | **PASÓ** |
| **06** | `POST` | Ausencia de campo obligatorio (`nombre`) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **07** | `POST` | Desbordamiento de longitud (`nombre` > 100 caracteres) | HTTP 400 Bad Request | Rechazado en Cliente/DRF | **PASÓ** |
| **08** | `POST` | Inyección con datos estrictamente necesarios | HTTP 201 Created | HTTP 201 Created | **PASÓ** |
| **09-10** | `POST` | Normalización de caracteres y símbolos matemáticos ($\sigma$-álgebras) | Ficha purgada en ASCII | `topologia-y-sigma-algebras` | **PASÓ** |
| **11** | `POST` | Inyección de cadena vacía (`nombre: ""`) | HTTP 400 Bad Request | Rechazado en Cliente/DRF | **PASÓ** |
| **12** | `POST` | Control de colisiones (fichas duplicadas) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASÓ** |
| **13** | `DELETE` | Eliminación física por `id_categoria` / `ficha` | HTTP 204 No Content | HTTP 204 No Content | **PASÓ** |
| **14** | `GET` | Lectura masiva (`list`) y lectura individual (`retrieve`) | HTTP 200 OK | HTTP 200 OK | **PASÓ** |
| **15** | `PUT/PATCH`| Ciclo de actualización completa y parcial | HTTP 200 OK | HTTP 200 OK | **PASÓ** |

---

## Desglose Detallado de Casos de Prueba

### 1. Pruebas de Creación y Normalización de Ficha (`POST /api/categorias/`)

#### Pruebas 01 a 05: Inserción Básica y Normalización
Se valida el comportamiento del serializador al calcular la `ficha` (*slug*) de forma automática o procesar la provista por el cliente.

```json
// Payload enviado (Prueba 02)
{
  "nombre": "Prueba3 ficha -&- slug @",
  "ficha": "macaco con catsup",
  "descripcion": "Esta categoría es una prueba de generación de ficha-slug",
  "padre_id": "6a70d50513e5ae8918879c43",
  "imagen_portada": ""
}
```
* **Respuesta:** `HTTP 201 Created`. La ficha enviada se normaliza a `"macaco-con-catsup"`.

---

#### Pruebas 09 y 10: Sanitización de Símbolos Matemáticos
Verificación de la función `generar_ficha()` ante notación científica en Unicode.

```json
// Payload enviado
{
  "nombre": "Topología y σ-álgebras",
  "descripcion": "Prueba con caracteres especiales de matemáticas"
}
```
* **Respuesta:** `HTTP 201 Created`.
* **Resultado en MongoDB:** Ficha generada correctamente como `"topologia-y-sigma-algebras"`. Se eliminan acentos y símbolos no alfanuméricos sin romper la cadena.

---

### 2. Pruebas de Validaciones de Borde y Excepciones (`POST /api/categorias/`)

#### Prueba 06: Ausencia de Campos Obligatorios
```json
// Payload enviado
{
  "descripcion": "Intento de creación sin nombre",
  "padre_id": null
}
```
* **Respuesta:** `HTTP 400 Bad Request`.
* **Detalle:** `{"nombre": ["Este campo es requerido."]}`.

---

#### Prueba 07: Longitud Máxima Excedida
```json
// Payload enviado
{
  "nombre": "Introducción a la Teoría Analítica de Números y su aplicación en la Criptografía de Curvas Elípticas Avanzadas",
  "descripcion": "Prueba de longitud máxima"
}
```
* **Respuesta:** `HTTP 400 Bad Request`.
* **Detalle:** Interceptado por DRF: *"Value must be no longer than 100 characters."*

---

#### Prueba 11: Cadenas Vacías
```json
// Payload enviado
{
  "nombre": "",
  "descripcion": "Categoría con nombre vacío"
}
```
* **Respuesta:** `HTTP 400 Bad Request`. Rechazado por `allow_blank=False` en la capa de serialización.

---

### 3. Prueba de Control de Unicidad y Colisiones (Prueba 12)

Se valida la resiliencia del sistema ante intentos de duplicación de categorías mediante el chequeo en `views.py` (`find_one({"ficha": ...})`) e índice único en MongoDB Atlas (`unique=True`).

```json
// Payload enviado dos veces consecutivas
{
  "nombre": "Análisis Funcional",
  "padre_id": null
}
```
* **Primera ejecución:** `HTTP 201 Created`. Se inserta el BSON en MongoDB.
* **Segunda ejecución:** `HTTP 400 Bad Request`.
* **Cuerpo de Respuesta:**
  ```json
  {
    "error": "Conflicto de entidad: Ya existe una categoría registrada con la ficha 'analisis-funcional'."
  }
  ```

---

### 4. Ciclo Completo de Mantenimiento CRUD (Pruebas 14 y 15)

#### A. Creación (`POST /api/categorias/`)
```json
// Request Body
{
  "nombre": "Estructuras Algebraicas",
  "ficha": "estructuras-algebraicas",
  "descripcion": "Grupos, anillos y cuerpos",
  "padre_id": null,
  "imagen_portada": ""
}
```
* **Respuesta:** `HTTP 201 Created` con `id_categoria: "feda2fca-e491-4e96-8893-e8737e5127f2"`.

---

#### B. Consulta General (`GET /api/categorias/`)
* **Respuesta:** `HTTP 200 OK`. Devuelve la matriz JSON con todas las categorías activas y sus campos `_id` serializados a cadena.

---

#### C. Actualización Total (`PUT /api/categorias/feda2fca-e491-4e96-8893-e8737e5127f2/`)
```json
// Request Body
{
  "nombre": "Álgebra Abstracta",
  "ficha": "algebra-abstracta",
  "descripcion": "Estudio de estructuras algebraicas avanzadas",
  "padre_id": null,
  "imagen_portada": ""
}
```
* **Respuesta:** `HTTP 200 OK`. Se ejecuta `replace_one` manteniendo inmutable el `id_categoria`.

---

#### D. Actualización Parcial (`PATCH /api/categorias/feda2fca-e491-4e96-8893-e8737e5127f2/`)
```json
// Request Body
{
  "nombre": "Álgebra Abstracta Aplicada"
}
```
* **Respuesta:** `HTTP 200 OK`.
* **Documento resultante en MongoDB:**
  ```json
  {
    "_id": "6a70f15df3b4d7cbf7f7728e",
    "id_categoria": "feda2fca-e491-4e96-8893-e8737e5127f2",
    "nombre": "Álgebra Abstracta Aplicada",
    "ficha": "algebra-abstracta-aplicada",
    "descripcion": "Estudio de estructuras algebraicas avanzadas",
    "padre_id": null,
    "imagen_portada": ""
  }
  ```

---

#### E. Eliminación (`DELETE /api/categorias/feda2fca-e491-4e96-8893-e8737e5127f2/`)
* **Respuesta:** `HTTP 204 No Content`. El documento se remueve de forma atómica de MongoDB Atlas.

---

## Conclusión Técnica

El controlador `CategoriaViewSet` ha superado las pruebas de integración HTTP. La capa de validación en Django REST Framework detiene solicitudes malformadas, las mutaciones `PUT` y `PATCH` garantizan la inmutabilidad de la clave primaria lógica (`id_categoria`), y el índice único en la base de datos previene la duplicación de fichas. El módulo queda certificado para su consumo desde el cliente React.
