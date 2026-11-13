from anargoritmia.pruebas_mongo import MongoAPITestCase
from usuarios.models import Usuario

URL = "/api/notas/"


def bloque(id_, tipo="texto", publico=True, contenido="$a^2+b^2=c^2$", **extra):
    return {"id": id_, "tipo": tipo, "publico": publico, "contenido": contenido, **extra}


class NotasTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.db["Categoria"].insert_one({"id_categoria": "cat-1", "nombre": "Álgebra", "ficha": "algebra"})
        self.autora = Usuario.objects.create_user(username="ada", email="ada@example.com", password="x")
        self.otro = Usuario.objects.create_user(username="otro", email="otro@example.com", password="x")
        self.admin = Usuario.objects.create_user(
            username="admin", email="admin@example.com", password="x", is_staff=True
        )
        self.client.force_authenticate(self.autora)

    def crear(self, **datos):
        respuesta = self.client.post(URL, datos, format="json")
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        return respuesta.data

    def crear_publicada(self, titulo="Teorema de Pitágoras", bloques=None):
        return self.crear(
            titulo=titulo, id_categoria="cat-1", es_borrador=False,
            bloques=bloques or [bloque("b1"), bloque("b2", publico=False, contenido="privado")],
        )

    def detalle(self, nota):
        return f"{URL}{nota['id_documento']}/"

    # --- Borradores y autoguardado ---------------------------------------
    def test_crear_borrador_vacio_para_autoguardado(self):
        nota = self.crear()
        self.assertTrue(nota["es_borrador"])
        self.assertEqual(nota["titulo"], "")
        self.assertTrue(nota["ficha"].startswith("sin-titulo-"))
        self.assertIsNone(nota["fecha_publicacion"])
        self.assertIsNotNone(nota["fecha_modificacion"])

    def test_varios_borradores_sin_titulo_no_chocan(self):
        self.crear()
        self.crear()

    def test_autoguardado_patch_bloques(self):
        nota = self.crear()
        bloques = [bloque("b1", contenido="  indentado\n    código"), bloque("b2", tipo="codigo", lenguaje="python")]
        respuesta = self.client.patch(self.detalle(nota), {"bloques": bloques}, format="json")
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["bloques"][0]["contenido"], "  indentado\n    código")
        self.assertEqual(respuesta.data["bloques"][1]["lenguaje"], "python")

    def test_ids_de_bloque_repetidos_400(self):
        respuesta = self.client.post(URL, {"bloques": [bloque("x"), bloque("x")]}, format="json")
        self.assertEqual(respuesta.status_code, 400)

    def test_tipo_de_bloque_invalido_400(self):
        respuesta = self.client.post(URL, {"bloques": [bloque("x", tipo="video")]}, format="json")
        self.assertEqual(respuesta.status_code, 400)

    # --- Publicación -----------------------------------------------------
    def test_publicar_exige_titulo_categoria_y_bloque_publico(self):
        nota = self.crear(bloques=[bloque("b1", publico=False)])
        respuesta = self.client.patch(self.detalle(nota), {"es_borrador": False}, format="json")
        self.assertEqual(respuesta.status_code, 400)
        for campo in ("titulo", "id_categoria", "bloques"):
            self.assertIn(campo, respuesta.data)

    def test_publicar_fija_fecha_y_despublicar_la_borra(self):
        nota = self.crear(titulo="Lista", id_categoria="cat-1", bloques=[bloque("b1")])
        publicada = self.client.patch(self.detalle(nota), {"es_borrador": False}, format="json").data
        self.assertIsNotNone(publicada["fecha_publicacion"])
        borrador = self.client.patch(self.detalle(nota), {"es_borrador": True}, format="json").data
        self.assertIsNone(borrador["fecha_publicacion"])

    def test_editar_publicada_conserva_fecha(self):
        nota = self.crear_publicada()
        respuesta = self.client.patch(self.detalle(nota), {"titulo": "Otro título"}, format="json")
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["fecha_publicacion"], nota["fecha_publicacion"])
        self.assertEqual(respuesta.data["ficha"], "otro-titulo")

    def test_contenido_derivado_de_bloques_publicos(self):
        nota = self.crear_publicada(bloques=[
            bloque("b1", contenido="uno"), bloque("b2", publico=False, contenido="secreto"),
            bloque("b3", tipo="codigo", contenido="print(1)"), bloque("b4", contenido="dos"),
        ])
        guardada = self.db["Nota"].find_one({"id_documento": nota["id_documento"]})
        self.assertEqual(guardada["contenido"], "uno\n\ndos")

    # --- Lectura pública: filtro en el servidor -----------------------------
    def test_lector_solo_recibe_bloques_publicos(self):
        nota = self.crear_publicada()
        self.client.force_authenticate(None)
        bloques = self.client.get(self.detalle(nota)).data["bloques"]
        self.assertEqual([b["id"] for b in bloques], ["b1"])
        # El listado no trae celdas, y su conteo no revela las privadas
        listado = self.client.get(URL).data
        self.assertNotIn("bloques", listado[0])
        self.assertEqual(listado[0]["celdas"]["total"], 1)

    def test_autor_recibe_todos_y_puede_previsualizar(self):
        nota = self.crear_publicada()
        self.assertEqual(len(self.client.get(self.detalle(nota)).data["bloques"]), 2)
        vista = self.client.get(self.detalle(nota) + "?vista=publica").data
        self.assertEqual(len(vista["bloques"]), 1)

    def test_listado_publico_excluye_borradores(self):
        self.crear(titulo="Borrador")
        self.crear_publicada("Publicada")
        self.client.force_authenticate(None)
        self.assertEqual([n["titulo"] for n in self.client.get(URL).data], ["Publicada"])

    def test_mias_incluye_borradores(self):
        self.crear(titulo="Borrador")
        respuesta = self.client.get(f"{URL}mias/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data), 1)

    def test_borrador_visible_solo_para_autor_o_admin(self):
        nota = self.crear(titulo="Borrador")
        self.assertEqual(self.client.get(self.detalle(nota)).status_code, 200)
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.get(self.detalle(nota)).status_code, 404)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.detalle(nota)).status_code, 200)

    def test_no_expone_correo_del_autor(self):
        nota = self.crear_publicada()
        self.assertNotIn("correo", nota["autor"])

    # --- Unicidad y permisos -----------------------------------------------
    def test_titulo_duplicado_del_mismo_autor_400(self):
        self.crear(titulo="Mi nota")
        respuesta = self.client.post(URL, {"titulo": "mi NOTA"}, format="json")
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("titulo", respuesta.data)

    def test_mismo_titulo_distinto_autor_permitido(self):
        self.crear(titulo="Compartido")
        self.client.force_authenticate(self.otro)
        self.crear(titulo="Compartido")

    def test_categoria_inexistente_400(self):
        respuesta = self.client.post(URL, {"id_categoria": "nada"}, format="json")
        self.assertEqual(respuesta.status_code, 400)

    def test_admin_puede_editar(self):
        nota = self.crear(titulo="Original")
        self.client.force_authenticate(self.admin)
        respuesta = self.client.patch(self.detalle(nota), {"titulo": "Corregida"}, format="json")
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["autor"]["alias"], "ada")

    def test_otro_usuario_no_edita_ni_borra(self):
        nota = self.crear()
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.patch(self.detalle(nota), {"titulo": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(self.detalle(nota)).status_code, 403)

    def test_borrar(self):
        nota = self.crear()
        self.assertEqual(self.client.delete(self.detalle(nota)).status_code, 204)


class DerechoAlOlvidoTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.db["Categoria"].insert_one({"id_categoria": "cat-1", "nombre": "Álgebra", "ficha": "algebra"})
        self.usuario = Usuario.objects.create_user(username="ada", email="ada@example.com", password="clave")
        self.admin = Usuario.objects.create_user(
            username="admin", email="admin@example.com", password="x", is_staff=True
        )
        self.client.force_authenticate(self.usuario)
        self.client.post(URL, {"titulo": "Borrador"}, format="json")
        self.client.post(URL, {"titulo": "Publicada", "id_categoria": "cat-1", "es_borrador": False,
                               "bloques": [bloque("b1")]}, format="json")

    def comprobar_anonimizado(self):
        notas = list(self.db["Nota"].find({}))
        self.assertEqual([n["titulo"] for n in notas], ["Publicada"])
        autor = notas[0]["autor"]
        self.assertEqual(autor["alias"], "Comunidad Anargoritmia")
        self.assertEqual(autor["correo"], "")
        self.assertNotEqual(autor["id_usuario"], str(self.usuario.id))

    def test_borrar_mi_cuenta_anonimiza(self):
        respuesta = self.client.delete("/api/auth/me/", {"password": "clave"}, format="json")
        self.assertEqual(respuesta.status_code, 204)
        self.comprobar_anonimizado()

    def test_admin_borra_cuenta_y_anonimiza(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/usuarios/{self.usuario.id}/").status_code, 204)
        self.comprobar_anonimizado()

    def test_cambiar_username_actualiza_alias(self):
        self.client.patch("/api/auth/me/", {"username": "ada-lovelace"}, format="json")
        aliases = {n["autor"]["alias"] for n in self.db["Nota"].find({})}
        self.assertEqual(aliases, {"ada-lovelace"})


class BaseDeDatosCaidaTests(MongoAPITestCase):
    """Si MongoDB no responde, la API contesta 503 con un mensaje claro (no 500)."""

    def test_mongo_caido_responde_503(self):
        from unittest import mock
        from pymongo.errors import ServerSelectionTimeoutError

        coleccion = mock.MagicMock()
        coleccion.find.side_effect = ServerSelectionTimeoutError("Atlas no responde")
        caida = mock.MagicMock()
        caida.__getitem__.return_value = coleccion
        with mock.patch("notas.api.views.db", caida):
            respuesta = self.client.get(URL)
        self.assertEqual(respuesta.status_code, 503)
        self.assertIn("base de datos no responde", respuesta.data["error"])


class RedisenoNotasTests(MongoAPITestCase):
    """Celdas con archivo y título, firma elegida, listados ligeros y control de concurrencia."""

    def setUp(self):
        super().setUp()
        self.db["Categoria"].insert_one({"id_categoria": "cat-1", "nombre": "Álgebra", "ficha": "algebra"})
        self.autora = Usuario.objects.create_user(
            username="ada", email="ada@example.com", password="x", first_name="Ada", last_name="Lovelace"
        )
        self.client.force_authenticate(self.autora)

    def crear(self, **datos):
        respuesta = self.client.post(URL, datos, format="json")
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        return respuesta.data

    def publicada(self):
        return self.crear(titulo="Newton", id_categoria="cat-1", es_borrador=False, bloques=[
            bloque("t1"),
            bloque("c1", tipo="codigo", lenguaje="python", archivo="newton.py", titulo="Método de Newton",
                   contenido="def f(x): return x"),
            bloque("p1", publico=False, contenido="borrador privado"),
        ])

    # --- Celdas ---------------------------------------------------------
    def test_celda_guarda_archivo_y_titulo(self):
        nota = self.publicada()
        codigo = nota["bloques"][1]
        self.assertEqual(codigo["archivo"], "newton.py")
        self.assertEqual(codigo["titulo"], "Método de Newton")
        self.assertEqual(nota["bloques"][0]["archivo"], "")

    def test_archivo_con_barras_o_espacios_400(self):
        for archivo in ("../etc/passwd", "mi archivo.py"):
            respuesta = self.client.post(URL, {"bloques": [bloque("x", archivo=archivo)]}, format="json")
            self.assertEqual(respuesta.status_code, 400, archivo)

    # --- Firma ----------------------------------------------------------
    def test_firma_alias_por_omision_y_nombre_si_se_elige(self):
        nota = self.publicada()
        self.assertEqual(nota["autor"]["firma"], "ada")
        self.client.patch("/api/auth/me/", {"firma": "nombre"}, format="json")
        lectura = self.client.get(f"{URL}{nota['id_documento']}/").data
        self.assertEqual(lectura["autor"]["firma"], "Ada Lovelace")
        self.assertEqual(self.client.get(URL).data[0]["autor"]["firma"], "Ada Lovelace")

    def test_firma_nombre_sin_nombre_usa_alias(self):
        sin_nombre = Usuario.objects.create_user(username="anon", email="anon@example.com", password="x",
                                                 firma="nombre")
        self.client.force_authenticate(sin_nombre)
        self.assertEqual(self.crear()["autor"]["firma"], "anon")

    def test_nota_antigua_sin_firma_muestra_alias(self):
        nota = self.publicada()
        self.db["Nota"].update_one({"id_documento": nota["id_documento"]}, {"$unset": {"autor.firma": ""}})
        self.assertEqual(self.client.get(URL).data[0]["autor"]["firma"], "ada")

    # --- Listados ligeros ---------------------------------------------------
    def test_catalogo_no_incluye_celdas_y_cuenta_solo_publicas(self):
        self.publicada()
        nota = self.client.get(URL).data[0]
        self.assertNotIn("bloques", nota)
        self.assertNotIn("contenido", nota)
        self.assertEqual(nota["celdas"], {"total": 2, "publicas": 2, "tipos_publicos": ["texto", "codigo"]})

    def test_mias_resume_celdas_y_correcciones(self):
        self.publicada()
        nota = self.client.get(f"{URL}mias/").data[0]
        self.assertNotIn("bloques", nota)
        self.assertEqual(nota["celdas"]["total"], 3)
        self.assertEqual(nota["celdas"]["publicas"], 2)
        self.assertEqual(nota["correcciones_abiertas"], 0)

    def test_nota_antigua_sin_resumen_se_completa(self):
        nota = self.publicada()
        self.db["Nota"].update_one({"id_documento": nota["id_documento"]}, {"$unset": {"celdas": ""}})
        self.assertEqual(self.client.get(f"{URL}mias/").data[0]["celdas"]["total"], 3)
        self.assertIn("celdas", self.db["Nota"].find_one({"id_documento": nota["id_documento"]}))

    def test_limite_del_listado(self):
        for i in range(3):
            self.crear(titulo=f"Nota {i}", id_categoria="cat-1", es_borrador=False, bloques=[bloque("b")])
        self.assertEqual(len(self.client.get(f"{URL}?limite=2").data), 2)
        self.assertEqual(len(self.client.get(f"{URL}?limite=abc").data), 3)

    def test_lectura_incluye_categoria(self):
        nota = self.publicada()
        self.client.force_authenticate(None)
        lectura = self.client.get(f"{URL}{nota['id_documento']}/").data
        self.assertEqual(lectura["categoria"], {"id_categoria": "cat-1", "nombre": "Álgebra", "ficha": "algebra"})
        self.assertEqual(lectura["celdas"]["total"], 2)

    # --- Concurrencia -------------------------------------------------------
    def test_revision_avanza_con_cada_guardado(self):
        nota = self.crear()
        self.assertEqual(nota["revision"], 1)
        r = self.client.patch(f"{URL}{nota['id_documento']}/", {"titulo": "A", "revision": 1}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["revision"], 2)

    def test_revision_vieja_responde_409_y_no_pisa(self):
        nota = self.crear()
        detalle = f"{URL}{nota['id_documento']}/"
        self.client.patch(detalle, {"titulo": "Primera ventana", "revision": 1}, format="json")
        r = self.client.patch(detalle, {"titulo": "Segunda ventana", "revision": 1}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.client.get(detalle).data["titulo"], "Primera ventana")

    def test_sin_revision_se_acepta(self):
        nota = self.crear()
        r = self.client.patch(f"{URL}{nota['id_documento']}/", {"titulo": "Sin control"}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_nota_antigua_sin_revision_se_puede_editar(self):
        nota = self.crear()
        self.db["Nota"].update_one({"id_documento": nota["id_documento"]}, {"$unset": {"revision": ""}})
        detalle = f"{URL}{nota['id_documento']}/"
        r = self.client.patch(detalle, {"titulo": "B", "revision": 0}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["revision"], 1)


class CorreccionesTests(MongoAPITestCase):
    """Correcciones comunitarias: ligadas a una celda pública, con tipo de error y descripción."""

    DESCRIPCION = "La derivada está mal: la de x al cuadrado es 2x y no x."

    def setUp(self):
        super().setUp()
        self.db["Categoria"].insert_one({"id_categoria": "cat-1", "nombre": "Álgebra", "ficha": "algebra"})
        self.autora = Usuario.objects.create_user(username="ada", email="ada@example.com", password="x")
        self.lector = Usuario.objects.create_user(username="lee", email="lee@example.com", password="x")
        self.otro = Usuario.objects.create_user(username="otro", email="otro@example.com", password="x")
        self.client.force_authenticate(self.autora)
        self.nota = self.client.post(URL, {
            "titulo": "Newton", "id_categoria": "cat-1", "es_borrador": False,
            "bloques": [bloque("t1"), bloque("c1", tipo="codigo", contenido="x = 1"),
                        bloque("p1", publico=False)],
        }, format="json").data
        self.url = f"{URL}{self.nota['id_documento']}/correcciones/"
        self.client.force_authenticate(self.lector)

    def proponer(self, **datos):
        cuerpo = {"id_bloque": "t1", "tipo_error": "matematico", "descripcion": self.DESCRIPCION, **datos}
        return self.client.post(self.url, cuerpo, format="json")

    def test_proponer_correccion(self):
        r = self.proponer(fragmento="f(x) = x^2")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["estado"], "abierta")
        self.assertEqual(r.data["tipo_bloque"], "texto")
        self.assertEqual(r.data["autor"]["firma"], "lee")
        self.assertNotIn("correo", r.data["autor"])

    def test_exige_celda_publica_existente(self):
        for id_bloque in ("p1", "no-existe"):
            r = self.proponer(id_bloque=id_bloque)
            self.assertEqual(r.status_code, 400)
            self.assertIn("id_bloque", r.data)

    def test_tipo_de_error_debe_corresponder_a_la_celda(self):
        r = self.proponer(tipo_error="codigo")  # celda de texto
        self.assertEqual(r.status_code, 400)
        self.assertIn("tipo_error", r.data)
        self.assertEqual(self.proponer(id_bloque="c1", tipo_error="replicacion").status_code, 201)

    def test_descripcion_minima(self):
        r = self.proponer(descripcion="esta mal")
        self.assertEqual(r.status_code, 400)
        self.assertIn("descripcion", r.data)

    def test_no_duplica_misma_celda_y_tipo(self):
        self.assertEqual(self.proponer().status_code, 201)
        self.assertEqual(self.proponer().status_code, 400)
        self.assertEqual(self.proponer(tipo_error="redaccion").status_code, 201)

    def test_maximo_de_abiertas_por_nota(self):
        combinaciones = [("t1", "matematico"), ("t1", "redaccion"), ("t1", "referencia"),
                         ("c1", "codigo"), ("c1", "replicacion"), ("c1", "matematico")]
        codigos = [self.proponer(id_bloque=b, tipo_error=t).status_code for b, t in combinaciones]
        self.assertEqual(codigos, [201] * 5 + [400])

    def test_autora_no_se_corrige_a_si_misma(self):
        self.client.force_authenticate(self.autora)
        self.assertEqual(self.proponer().status_code, 400)

    def test_sin_sesion_401(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.proponer().status_code, 401)

    def test_borrador_no_admite_correcciones(self):
        self.client.force_authenticate(self.autora)
        self.client.patch(f"{URL}{self.nota['id_documento']}/", {"es_borrador": True}, format="json")
        self.client.force_authenticate(self.lector)
        self.assertEqual(self.proponer().status_code, 404)

    def test_visibilidad(self):
        self.proponer()
        self.client.force_authenticate(self.otro)
        self.proponer(tipo_error="redaccion")
        self.assertEqual(len(self.client.get(self.url).data), 1)  # solo la suya
        self.client.force_authenticate(self.autora)
        self.assertEqual(len(self.client.get(self.url).data), 2)
        self.assertEqual(len(self.client.get(f"{self.url}?estado=abierta").data), 2)
        self.assertEqual(self.client.get(f"{URL}mias/").data[0]["correcciones_abiertas"], 2)

    def test_autora_atiende_y_lector_no(self):
        correccion = self.proponer().data
        detalle = f"/api/correcciones/{correccion['id_correccion']}/"
        r = self.client.patch(detalle, {"estado": "atendida"}, format="json")
        self.assertEqual(r.status_code, 403)

        self.client.force_authenticate(self.autora)
        r = self.client.patch(detalle, {"estado": "atendida", "respuesta": "Corregido, gracias."}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["estado"], "atendida")
        self.assertIsNotNone(r.data["fecha_resolucion"])
        reabierta = self.client.patch(detalle, {"estado": "abierta"}, format="json").data
        self.assertIsNone(reabierta["fecha_resolucion"])

    def test_retirar_solo_la_propia_y_abierta(self):
        correccion = self.proponer().data
        detalle = f"/api/correcciones/{correccion['id_correccion']}/"
        self.client.force_authenticate(self.otro)
        self.assertEqual(self.client.delete(detalle).status_code, 403)
        self.client.force_authenticate(self.lector)
        self.assertEqual(self.client.delete(detalle).status_code, 204)

    def test_borrar_nota_borra_sus_correcciones(self):
        self.proponer()
        self.client.force_authenticate(self.autora)
        self.client.delete(f"{URL}{self.nota['id_documento']}/")
        self.assertEqual(self.db["Correccion"].count_documents({}), 0)

    def test_borrar_cuenta_anonimiza_sus_correcciones(self):
        self.proponer()
        self.client.force_authenticate(self.lector)
        self.client.delete("/api/auth/me/", {"password": "x"}, format="json")
        autor = self.db["Correccion"].find_one({})["autor"]
        self.assertEqual(autor["firma"], "Comunidad Anargoritmia")
        self.assertEqual(autor["correo"], "")
