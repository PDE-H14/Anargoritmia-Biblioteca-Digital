import io
import os

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from anargoritmia.pruebas_mongo import MongoAPITestCase
from usuarios.repositorio import crear_usuario

URL = "/api/categorias/"


def imagen(nombre="portada.png", tamano=(2, 2)):
    buffer = io.BytesIO()
    Image.new("RGB", tamano).save(buffer, format="PNG")
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type="image/png")


class CategoriasTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.admin = crear_usuario(
            username="admin", email="admin@example.com", password="x", is_staff=True
        )
        self.client.force_authenticate(self.admin)

    def crear(self, nombre, **extra):
        datos = {"nombre": nombre, "descripcion": f"Descripción de {nombre}", **extra}
        respuesta = self.client.post(URL, datos, format="multipart")
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        return respuesta.data

    def imagenes_guardadas(self):
        return self.db["Imagen"].count_documents({})

    # --- Creación -------------------------------------------------------
    def test_crear_genera_ficha_y_url_absoluta(self):
        cat = self.crear("Álgebra Lineal", imagen_portada=imagen())
        self.assertEqual(cat["ficha"], "algebra-lineal")
        self.assertTrue(cat["imagen_portada"].startswith("http://testserver/api/imagenes/"))
        self.assertTrue(cat["imagen_portada"].endswith(".webp"))
        # En la BD se guarda la ruta relativa, no el host
        guardada = self.db["Categoria"].find_one({"ficha": "algebra-lineal"})
        self.assertTrue(guardada["imagen_portada"].startswith("/api/imagenes/"))
        # Nada se escribe en disco
        self.assertEqual(os.listdir(self.media), [])

    def test_crear_ficha_duplicada_400(self):
        self.crear("Cálculo")
        respuesta = self.client.post(URL, {"nombre": "calculo"}, format="multipart")
        self.assertEqual(respuesta.status_code, 400)

    def test_crear_con_padre_inexistente_400(self):
        respuesta = self.client.post(URL, {"nombre": "Hija", "padres": ["no-existe"]}, format="multipart")
        self.assertEqual(respuesta.status_code, 400)

    def test_no_staff_no_escribe(self):
        alumno = crear_usuario(username="a", email="a@example.com", password="x")
        self.client.force_authenticate(alumno)
        self.assertEqual(self.client.post(URL, {"nombre": "X"}, format="multipart").status_code, 403)

    def test_listado_publico(self):
        self.crear("Pública")
        self.client.force_authenticate(None)
        respuesta = self.client.get(URL)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data), 1)

    # --- PATCH ----------------------------------------------------------
    def test_patch_sin_nombre_conserva_ficha_e_imagen(self):
        cat = self.crear("Geometría", imagen_portada=imagen())
        respuesta = self.client.patch(
            f"{URL}{cat['id_categoria']}/", {"descripcion": "Nueva"}, format="multipart"
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["ficha"], "geometria")
        self.assertEqual(respuesta.data["descripcion"], "Nueva")
        self.assertEqual(respuesta.data["imagen_portada"], cat["imagen_portada"])

    def test_patch_dos_categorias_sin_nombre_no_choca(self):
        a = self.crear("A")
        b = self.crear("B")
        for cat in (a, b):
            respuesta = self.client.patch(
                f"{URL}{cat['id_categoria']}/", {"descripcion": "x"}, format="multipart"
            )
            self.assertEqual(respuesta.status_code, 200)

    # --- PUT ------------------------------------------------------------
    def test_put_sin_imagen_conserva_la_actual(self):
        cat = self.crear("Topología", imagen_portada=imagen())
        respuesta = self.client.put(
            f"{URL}{cat['id_categoria']}/", {"nombre": "Topología", "descripcion": "d"}, format="multipart"
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["imagen_portada"], cat["imagen_portada"])

    def test_put_con_imagen_nueva_reemplaza_y_borra_la_anterior(self):
        cat = self.crear("Análisis", imagen_portada=imagen())
        self.assertEqual(self.imagenes_guardadas(), 1)
        respuesta = self.client.put(
            f"{URL}{cat['id_categoria']}/",
            {"nombre": "Análisis", "descripcion": "d", "imagen_portada": imagen("nueva.png")},
            format="multipart",
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertNotEqual(respuesta.data["imagen_portada"], cat["imagen_portada"])
        self.assertEqual(self.imagenes_guardadas(), 1)

    def test_put_sin_padres_los_elimina(self):
        padre = self.crear("Padre")
        hija = self.crear("Hija", padres=[padre["ficha"]])
        respuesta = self.client.put(
            f"{URL}{hija['id_categoria']}/", {"nombre": "Hija", "descripcion": "d"}, format="multipart"
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data["padres"], [])

    def test_put_a_ficha_ocupada_400(self):
        self.crear("Uno")
        dos = self.crear("Dos")
        respuesta = self.client.put(
            f"{URL}{dos['id_categoria']}/", {"nombre": "Uno", "descripcion": "d"}, format="multipart"
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_renombrar_padre_actualiza_a_las_hijas(self):
        padre = self.crear("Probabilidad")
        hija = self.crear("Cadenas de Markov", padres=["probabilidad"])
        self.client.put(
            f"{URL}{padre['id_categoria']}/", {"nombre": "Probabilidad y Estadística", "descripcion": "d"},
            format="multipart",
        )
        hija_bd = self.db["Categoria"].find_one({"id_categoria": hija["id_categoria"]})
        self.assertEqual(hija_bd["padres"], ["probabilidad-y-estadistica"])

    def test_ciclo_en_jerarquia_400(self):
        a = self.crear("A")
        self.crear("B", padres=["a"])
        respuesta = self.client.put(
            f"{URL}{a['id_categoria']}/", {"nombre": "A", "descripcion": "d", "padres": ["b"]},
            format="multipart",
        )
        self.assertEqual(respuesta.status_code, 400)

    # --- DELETE ---------------------------------------------------------
    def test_borrar_responde_204_y_elimina_imagen(self):
        cat = self.crear("Efímera", imagen_portada=imagen())
        respuesta = self.client.delete(f"{URL}{cat['id_categoria']}/")
        self.assertEqual(respuesta.status_code, 204)
        self.assertEqual(self.imagenes_guardadas(), 0)

    def test_no_borra_categoria_padre(self):
        padre = self.crear("Padre")
        self.crear("Hija", padres=["padre"])
        self.assertEqual(self.client.delete(f"{URL}{padre['id_categoria']}/").status_code, 400)

    def test_no_borra_categoria_con_notas(self):
        cat = self.crear("Con notas")
        self.db["Nota"].insert_one({"id_documento": "n1", "id_categoria": cat["id_categoria"]})
        self.assertEqual(self.client.delete(f"{URL}{cat['id_categoria']}/").status_code, 400)


class PortadasEnMongoTests(MongoAPITestCase):
    """Portadas comprimidas a WebP en MongoDB y servidas por la API."""

    def setUp(self):
        super().setUp()
        self.admin = crear_usuario(username="admin", email="admin@example.com", password="x", is_staff=True)
        self.client.force_authenticate(self.admin)

    def subir(self, archivo):
        return self.client.post(URL, {"nombre": "Con portada", "imagen_portada": archivo}, format="multipart")

    def test_reduce_a_1600_y_sirve_webp_con_cache(self):
        respuesta = self.subir(imagen("grande.png", (3200, 1000)))
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        guardada = self.db["Imagen"].find_one({})
        self.assertEqual((guardada["ancho"], guardada["alto"]), (1600, 500))

        self.client.force_authenticate(None)
        ruta = respuesta.data["imagen_portada"].replace("http://testserver", "")
        servida = self.client.get(ruta)
        self.assertEqual(servida.status_code, 200)
        self.assertEqual(servida["Content-Type"], "image/webp")
        self.assertIn("immutable", servida["Cache-Control"])
        self.assertEqual(Image.open(io.BytesIO(servida.content)).format, "WEBP")
        # Revalidación: el navegador ya la tiene
        self.assertEqual(self.client.get(ruta, HTTP_IF_NONE_MATCH=servida["ETag"]).status_code, 304)

    def test_imagen_inexistente_404(self):
        self.assertEqual(self.client.get(f"/api/imagenes/{'0' * 32}.webp").status_code, 404)

    def test_archivo_que_no_es_imagen_400(self):
        falso = SimpleUploadedFile("falso.png", b"no soy una imagen", content_type="image/png")
        self.assertEqual(self.subir(falso).status_code, 400)
        self.assertEqual(self.db["Imagen"].count_documents({}), 0)

    def test_migrar_portadas_de_uploads(self):
        import io as io_texto
        from django.core.management import call_command

        Image.new("RGB", (2000, 1500)).save(os.path.join(self.media, "Lotería.jpeg"), format="JPEG")
        self.db["Categoria"].insert_one({
            "id_categoria": "c1", "nombre": "Vieja", "ficha": "vieja", "padres": [],
            "imagen_portada": "/uploads/Loter%C3%ADa.jpeg",
        })
        salida = io_texto.StringIO()
        call_command("migrar_portadas", "--simular", stdout=salida)
        self.assertIn("[simulación] 1 portadas migradas", salida.getvalue())
        self.assertEqual(self.db["Imagen"].count_documents({}), 0)

        call_command("migrar_portadas", stdout=io_texto.StringIO())
        categoria = self.db["Categoria"].find_one({"id_categoria": "c1"})
        self.assertRegex(categoria["imagen_portada"], r"^/api/imagenes/[0-9a-f]{32}\.webp$")
        self.assertEqual(self.db["Imagen"].find_one({})["ancho"], 1600)
        # No borra el original y repetir no duplica
        self.assertTrue(os.path.exists(os.path.join(self.media, "Lotería.jpeg")))
        call_command("migrar_portadas", stdout=io_texto.StringIO())
        self.assertEqual(self.db["Imagen"].count_documents({}), 1)


class EnfoquePortadaTests(MongoAPITestCase):
    """Punto de enfoque de la portada: se guarda, se valida y vuelve al centro con una imagen nueva."""

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(
            crear_usuario(username="admin", email="admin@example.com", password="x", is_staff=True)
        )

    def test_por_omision_centro_y_se_guarda_el_elegido(self):
        cat = self.client.post(URL, {"nombre": "Grafos", "imagen_portada": imagen()}, format="multipart").data
        self.assertEqual((cat["enfoque_x"], cat["enfoque_y"]), (50, 50))
        respuesta = self.client.patch(
            f"{URL}{cat['id_categoria']}/", {"enfoque_x": "20.04", "enfoque_y": "75"}, format="multipart"
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual((respuesta.data["enfoque_x"], respuesta.data["enfoque_y"]), (20.0, 75.0))
        self.assertEqual(respuesta.data["imagen_portada"], cat["imagen_portada"])

    def test_fuera_de_rango_400(self):
        respuesta = self.client.post(URL, {"nombre": "Mal", "enfoque_x": "120"}, format="multipart")
        self.assertEqual(respuesta.status_code, 400)

    def test_imagen_nueva_sin_enfoque_vuelve_al_centro(self):
        cat = self.client.post(
            URL, {"nombre": "Redes", "imagen_portada": imagen(), "enfoque_x": "10", "enfoque_y": "90"}, format="multipart"
        ).data
        self.assertEqual((cat["enfoque_x"], cat["enfoque_y"]), (10, 90))
        respuesta = self.client.patch(
            f"{URL}{cat['id_categoria']}/", {"imagen_portada": imagen("otra.png")}, format="multipart"
        )
        self.assertEqual((respuesta.data["enfoque_x"], respuesta.data["enfoque_y"]), (50, 50))

    def test_categoria_antigua_sin_enfoque_responde_centro(self):
        self.db["Categoria"].insert_one({"id_categoria": "c1", "nombre": "Vieja", "ficha": "vieja", "padres": []})
        dato = self.client.get(f"{URL}c1/").data
        self.assertEqual((dato["enfoque_x"], dato["enfoque_y"]), (50, 50))
