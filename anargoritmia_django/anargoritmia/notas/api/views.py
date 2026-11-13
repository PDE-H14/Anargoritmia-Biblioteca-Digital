import uuid
from datetime import datetime, timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from db import db
from notas.servicios import autor_de
from notas.busqueda import filtro_busqueda
from .serializers import NotaSerializer, NotaResumenSerializer, generar_ficha
from .correcciones import (
    CorreccionSerializer, LimiteCorrecciones, contar_abiertas, crear_correccion, listar_correcciones,
)

LICENCIA = "CC BY-SA 4.0"
MENSAJE_DUPLICADO = "Ya existe un documento de este autor con este título."
MENSAJE_CONFLICTO = (
    "La nota cambió en otra pestaña o dispositivo después de que la abriste. "
    "Recarga la página para ver la versión más reciente antes de seguir editando."
)

# Listados: todo menos el contenido de las celdas (lo pesado de cada nota)
PROYECCION_RESUMEN = {"_id": 0, "bloques": 0, "contenido": 0, "autor.correo": 0}
LIMITE_LISTADO = 100
LIMITE_LISTADO_MAX = 500


def ahora():
    """Fecha actual en UTC truncada a milisegundos, la precisión que guarda MongoDB."""
    fecha = datetime.now(timezone.utc)
    return fecha.replace(microsecond=fecha.microsecond // 1000 * 1000)


def error(mensaje, codigo=status.HTTP_400_BAD_REQUEST):
    return Response({"error": mensaje}, status=codigo)


def puede_editar(nota, usuario):
    """Solo el autor original o un administrador modifican una nota."""
    return usuario.is_authenticated and (
        nota['autor']['id_usuario'] == str(usuario.id) or usuario.is_staff
    )


def calcular_ficha(titulo, id_documento):
    """Ficha para URLs; los borradores sin título reciben una provisional única."""
    return generar_ficha(titulo or "") or f"sin-titulo-{id_documento[:8]}"


def texto_publico(bloques):
    """
    Texto plano de las celdas de texto públicas y de los enunciados de los
    ejercicios públicos (nunca sus soluciones). Se guarda en `contenido`
    para búsquedas y vistas previas (y para cumplir el validador de Atlas).
    """
    return "\n\n".join(
        b.get("contenido", "") for b in bloques
        if b.get("tipo") in ("texto", "ejercicio") and b.get("publico")
    )


def ruta_de_estudio(nota):
    """
    Prerrequisitos de la nota (en el orden que eligió su autor) y notas
    publicadas que la tienen como prerrequisito («para seguir»). Solo se
    exponen notas publicadas, con su título y su firma.
    """
    proyeccion = {"_id": 0, "id_documento": 1, "titulo": 1, "autor": 1}
    resumen = lambda n: {
        "id_documento": n["id_documento"],
        "titulo": n.get("titulo", ""),
        "firma": (n.get("autor") or {}).get("firma") or (n.get("autor") or {}).get("alias", ""),
    }
    ids = nota.get("prerrequisitos") or []
    encontradas = {
        n["id_documento"]: n
        for n in db["Nota"].find({"id_documento": {"$in": ids}, "es_borrador": False}, proyeccion)
    }
    siguen = db["Nota"].find(
        {"prerrequisitos": nota["id_documento"], "es_borrador": False}, proyeccion
    ).sort("fecha_publicacion", -1).limit(10)
    return {
        "prerrequisitos": [resumen(encontradas[i]) for i in ids if i in encontradas],
        "siguen": [resumen(n) for n in siguen],
    }


def titulo_libre(titulo, id_autor):
    """Título que el autor aún no usa: «X», «X (versión 2)», «X (versión 3)»..."""
    candidato, n = titulo, 1
    while db["Nota"].find_one({"autor.id_usuario": id_autor, "ficha": generar_ficha(candidato)}, {"_id": 1}):
        n += 1
        candidato = f"{titulo} (versión {n})"
    return candidato


def resumen_celdas(bloques):
    """Conteo que se guarda con la nota para que los listados no carguen las celdas."""
    publicas = [b for b in bloques if b.get("publico")]
    tipos = []
    for b in publicas:
        if b.get("tipo") not in tipos:
            tipos.append(b.get("tipo"))
    return {"total": len(bloques), "publicas": len(publicas), "tipos_publicos": tipos}


def resumen_publico(celdas):
    """Lo que un lector puede saber del conteo: solo las celdas públicas existen para él."""
    return {**celdas, "total": celdas.get("publicas", 0)}


def leer_limite(request):
    try:
        limite = int(request.query_params.get("limite", LIMITE_LISTADO))
    except ValueError:
        limite = LIMITE_LISTADO
    return max(1, min(limite, LIMITE_LISTADO_MAX))


def completar_resumenes(coleccion, notas):
    """
    Las notas guardadas antes del rediseño no tienen `celdas`: se calcula una
    vez y se guarda, para que los siguientes listados ya no lo necesiten.
    """
    faltantes = [n["id_documento"] for n in notas if "celdas" not in n]
    if not faltantes:
        return notas
    calculados = {}
    for nota in coleccion.find({"id_documento": {"$in": faltantes}}, {"id_documento": 1, "bloques": 1}):
        resumen = resumen_celdas(nota.get("bloques", []))
        calculados[nota["id_documento"]] = resumen
        coleccion.update_one({"id_documento": nota["id_documento"]}, {"$set": {"celdas": resumen}})
    for nota in notas:
        if "celdas" not in nota:
            nota["celdas"] = calculados.get(nota["id_documento"], resumen_celdas([]))
    return notas


def version_publica(nota):
    """Copia de la nota con solo sus bloques públicos: lo que ve un lector."""
    publica = {**nota, "bloques": [b for b in nota.get("bloques", []) if b.get("publico")]}
    publica["celdas"] = resumen_celdas(publica["bloques"])
    return publica


class NotaViewSet(viewsets.GenericViewSet):
    lookup_field = 'id_documento'
    serializer_class = NotaSerializer
    throttle_scope = None  # solo la acción de correcciones tiene límite propio

    @property
    def coleccion(self):
        return db['Nota']

    def get_permissions(self):
        """
        Lectura pública para notas publicadas;
        escritura y correcciones restringidas a usuarios autenticados vía JWT.
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def serializar(self, documento, codigo=status.HTTP_200_OK):
        return Response(NotaSerializer(documento).data, status=codigo)

    def serializer_de_edicion(self, nota, data, parcial):
        contexto = self.get_serializer_context()
        contexto['nota'] = nota
        contexto['id_autor'] = nota['autor']['id_usuario']
        contexto['id_documento'] = nota['id_documento']
        return NotaSerializer(data=data, partial=parcial, context=contexto)

    @staticmethod
    def completar_derivados(datos, id_documento):
        """Campos que el servidor calcula a partir de lo editable."""
        if 'titulo' in datos:
            datos['ficha'] = calcular_ficha(datos['titulo'], id_documento)
        if 'bloques' in datos:
            datos['bloques'] = [dict(b) for b in datos['bloques']]
            datos['contenido'] = texto_publico(datos['bloques'])
            datos['celdas'] = resumen_celdas(datos['bloques'])
        datos['fecha_modificacion'] = ahora()
        return datos

    # ------------------------------------------------------------------ #
    # Lectura
    # ------------------------------------------------------------------ #
    def list(self, request):
        """
        Catálogo público: notas publicadas, en versión ligera (sin el contenido
        de las celdas), de la más reciente a la más antigua.
        Filtros opcionales: ?categoria=<id_categoria>, ?limite=<n> (máx. 500)
        y ?q=<palabras> (ver notas/busqueda.py).
        """
        query = {"es_borrador": False}
        id_categoria = request.query_params.get('categoria')
        if id_categoria:
            query["id_categoria"] = id_categoria
        busqueda = filtro_busqueda(request.query_params.get('q'))
        if busqueda:
            query.update(busqueda)

        notas = list(
            self.coleccion.find(query, PROYECCION_RESUMEN)
            .sort("fecha_publicacion", -1)
            .limit(leer_limite(request))
        )
        completar_resumenes(self.coleccion, notas)
        for nota in notas:
            nota["celdas"] = resumen_publico(nota["celdas"])
        return Response(NotaResumenSerializer(notas, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def mias(self, request):
        """
        GET /api/notas/mias/: todas las notas del usuario autenticado, incluidos
        borradores, en versión ligera y con su número de correcciones abiertas,
        de la más reciente a la más antigua.
        """
        notas = list(
            self.coleccion.find({"autor.id_usuario": str(request.user.id)}, PROYECCION_RESUMEN)
            .sort("fecha_modificacion", -1)
        )
        completar_resumenes(self.coleccion, notas)
        abiertas = contar_abiertas(n["id_documento"] for n in notas)
        for nota in notas:
            nota["correcciones_abiertas"] = abiertas.get(nota["id_documento"], 0)
        return Response(NotaResumenSerializer(notas, many=True).data, status=status.HTTP_200_OK)

    def retrieve(self, request, id_documento=None):
        """
        - Autor o administrador: la nota completa (borradores y bloques privados),
          salvo que pida ?vista=publica para previsualizar lo que ve un lector.
        - Cualquier otra persona: solo notas publicadas y solo sus bloques públicos.
        Incluye nombre y ficha de su categoría para no pedirlas aparte.
        """
        nota = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0})
        if nota:
            editable = puede_editar(nota, request.user)
            if not editable and nota.get('es_borrador'):
                nota = None
        if not nota:
            return error("El documento no existe o se encuentra en estado de borrador.",
                         status.HTTP_404_NOT_FOUND)

        if nota.get("id_categoria"):
            categoria = db["Categoria"].find_one(
                {"id_categoria": nota["id_categoria"]},
                {"_id": 0, "id_categoria": 1, "nombre": 1, "ficha": 1},
            )
            if categoria:
                nota["categoria"] = categoria

        nota["ruta"] = ruta_de_estudio(nota)

        if editable and request.query_params.get('vista') != 'publica':
            nota.setdefault("celdas", resumen_celdas(nota.get("bloques", [])))
            return self.serializar(nota)
        # Lectores, o el autor previsualizando lo que verá un lector
        return self.serializar(version_publica(nota))

    # ------------------------------------------------------------------ #
    # Escritura
    # ------------------------------------------------------------------ #
    def create(self, request):
        """
        Requiere JWT. El servidor fija identificador, autor, ficha y licencia.
        Una nota nueva puede crearse vacía (borrador) para el autoguardado.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)
        datos.pop('revision', None)
        datos.setdefault('bloques', [])

        datos['id_documento'] = str(uuid.uuid4())
        datos['licencia'] = LICENCIA
        datos['autor'] = autor_de(request.user)
        datos['revision'] = 1
        self.completar_derivados(datos, datos['id_documento'])
        datos['fecha_publicacion'] = None if datos['es_borrador'] else datos['fecha_modificacion']

        try:
            self.coleccion.insert_one(datos)
        except DuplicateKeyError:
            return error(MENSAJE_DUPLICADO)

        datos.pop('_id', None)
        return self.serializar(datos, status.HTTP_201_CREATED)

    def update(self, request, id_documento=None):
        """Actualización completa (PUT)."""
        return self.actualizar(request, id_documento, parcial=False)

    def partial_update(self, request, id_documento=None):
        """Actualización parcial (PATCH): lo que usa el autoguardado."""
        return self.actualizar(request, id_documento, parcial=True)

    def actualizar(self, request, id_documento, parcial):
        """
        Dos viajes a la base de datos: leer la nota (permisos y validación) y
        escribirla devolviendo el resultado. Si el cliente envía `revision`,
        el guardado se rechaza con 409 cuando la nota cambió desde entonces.
        """
        nota = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0})
        if not nota:
            return error("El documento no existe.", status.HTTP_404_NOT_FOUND)
        if not puede_editar(nota, request.user):
            return error("Solo el autor original o un administrador pueden modificar este recurso.",
                         status.HTTP_403_FORBIDDEN)

        serializer = self.serializer_de_edicion(nota, request.data, parcial)
        serializer.is_valid(raise_exception=True)
        cambios = dict(serializer.validated_data)

        revision_cliente = cambios.pop('revision', None)
        revision_actual = nota.get('revision', 0)
        if revision_cliente is not None and revision_cliente != revision_actual:
            return error(MENSAJE_CONFLICTO, status.HTTP_409_CONFLICT)

        cambios['licencia'] = LICENCIA
        self.completar_derivados(cambios, id_documento)

        # La fecha de publicación se fija la primera vez que se publica y
        # se borra al regresar a borrador.
        if 'es_borrador' in cambios:
            if cambios['es_borrador']:
                cambios['fecha_publicacion'] = None
            elif not nota.get('fecha_publicacion'):
                cambios['fecha_publicacion'] = cambios['fecha_modificacion']

        # El filtro por revisión evita pisar un guardado que llegó entre la
        # lectura y la escritura (las notas previas al rediseño no la tienen).
        filtro = {
            "id_documento": id_documento,
            "revision": revision_actual if 'revision' in nota else {"$exists": False},
        }
        try:
            actualizada = self.coleccion.find_one_and_update(
                filtro,
                {"$set": cambios, "$inc": {"revision": 1}},
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return error(MENSAJE_DUPLICADO)
        if actualizada is None:
            return error(MENSAJE_CONFLICTO, status.HTTP_409_CONFLICT)
        actualizada.pop("_id", None)
        return self.serializar(actualizada)

    def destroy(self, request, id_documento=None):
        """Eliminación física (DELETE), junto con sus correcciones."""
        nota = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0, "autor": 1})
        if not nota:
            return error("El documento no existe.", status.HTTP_404_NOT_FOUND)
        if not puede_editar(nota, request.user):
            return error("No tienes permisos para eliminar este recurso.", status.HTTP_403_FORBIDDEN)

        self.coleccion.delete_one({"id_documento": id_documento})
        db["Correccion"].delete_many({"id_documento": id_documento})
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------ #
    # Versión derivada
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=['post'])
    def derivar(self, request, id_documento=None):
        """
        POST /api/notas/{id}/derivar/: crea un borrador propio a partir de
        una nota publicada, con su atribución (`origen`), como permite y exige
        la licencia CC BY-SA. De una nota ajena solo se copian las celdas
        públicas; de una propia, todas.
        """
        nota = self.coleccion.find_one({"id_documento": id_documento}, {"_id": 0})
        if not nota:
            return error("El documento no existe.", status.HTTP_404_NOT_FOUND)
        propia = puede_editar(nota, request.user)
        if nota.get("es_borrador") and not propia:
            return error("El documento no existe o se encuentra en estado de borrador.",
                         status.HTTP_404_NOT_FOUND)

        fuente = nota if propia else version_publica(nota)
        id_nuevo = str(uuid.uuid4())
        autor = autor_de(request.user)
        datos = {
            "id_documento": id_nuevo,
            "titulo": titulo_libre(nota.get("titulo") or "Nota sin título", autor["id_usuario"]),
            "id_categoria": nota.get("id_categoria", ""),
            "etiquetas": list(nota.get("etiquetas", [])),
            "prerrequisitos": list(nota.get("prerrequisitos", [])),
            "bloques": [dict(b) for b in fuente.get("bloques", [])],
            "licencia": LICENCIA,
            "autor": autor,
            "es_borrador": True,
            "fecha_publicacion": None,
            "revision": 1,
            "origen": {
                "id_documento": nota["id_documento"],
                "titulo": nota.get("titulo", ""),
                "firma": (nota.get("autor") or {}).get("firma") or (nota.get("autor") or {}).get("alias", ""),
            },
        }
        self.completar_derivados(datos, id_nuevo)
        try:
            self.coleccion.insert_one(datos)
        except DuplicateKeyError:
            return error(MENSAJE_DUPLICADO)
        datos.pop("_id", None)
        return self.serializar(datos, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------ #
    # Correcciones comunitarias
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=['get', 'post'], url_path='correcciones',
            throttle_classes=[LimiteCorrecciones], throttle_scope='correcciones')
    def correcciones(self, request, id_documento=None):
        """
        GET  /api/notas/{id}/correcciones/[?estado=abierta]: el autor y staff ven
             todas; cualquier otra persona, solo las que propuso.
        POST /api/notas/{id}/correcciones/: propone una corrección sobre una
             celda pública, con tipo de error y descripción.
        """
        nota = self.coleccion.find_one(
            {"id_documento": id_documento},
            {"_id": 0, "id_documento": 1, "autor": 1, "es_borrador": 1, "bloques": 1},
        )
        if not nota or (nota.get("es_borrador") and not puede_editar(nota, request.user)):
            return error("El documento no existe o se encuentra en estado de borrador.",
                         status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            lista = listar_correcciones(nota, request.user, request.query_params.get("estado"))
            return Response(CorreccionSerializer(lista, many=True).data)
        return crear_correccion(nota, request.user, request.data, self.get_serializer_context())
