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
        listado = self.client.get(URL).data
        self.assertEqual([b["id"] for b in listado[0]["bloques"]], ["b1"])

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
