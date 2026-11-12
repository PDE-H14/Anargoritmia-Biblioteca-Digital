import io
import os

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from anargoritmia.pruebas_mongo import MongoAPITestCase
from usuarios.models import Usuario

URL = "/api/categorias/"


def imagen(nombre="portada.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2)).save(buffer, format="PNG")
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type="image/png")


class CategoriasTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.admin = Usuario.objects.create_user(
            username="admin", email="admin@example.com", password="x", is_staff=True
        )
        self.client.force_authenticate(self.admin)

    def crear(self, nombre, **extra):
        datos = {"nombre": nombre, "descripcion": f"Descripción de {nombre}", **extra}
        respuesta = self.client.post(URL, datos, format="multipart")
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        return respuesta.data

    def archivos_subidos(self):
        return os.listdir(self.media)

    # --- Creación -------------------------------------------------------
    def test_crear_genera_ficha_y_url_absoluta(self):
        cat = self.crear("Álgebra Lineal", imagen_portada=imagen())
        self.assertEqual(cat["ficha"], "algebra-lineal")
        self.assertTrue(cat["imagen_portada"].startswith("http://testserver/uploads/"))
        # En la BD se guarda la ruta relativa, no el host
        guardada = self.db["Categoria"].find_one({"ficha": "algebra-lineal"})
        self.assertTrue(guardada["imagen_portada"].startswith("/uploads/"))

    def test_crear_ficha_duplicada_400(self):
        self.crear("Cálculo")
        respuesta = self.client.post(URL, {"nombre": "calculo"}, format="multipart")
        self.assertEqual(respuesta.status_code, 400)

    def test_crear_con_padre_inexistente_400(self):
        respuesta = self.client.post(URL, {"nombre": "Hija", "padres": ["no-existe"]}, format="multipart")
        self.assertEqual(respuesta.status_code, 400)

    def test_no_staff_no_escribe(self):
        alumno = Usuario.objects.create_user(username="a", email="a@example.com", password="x")
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
        self.assertEqual(len(self.archivos_subidos()), 1)
        respuesta = self.client.put(
            f"{URL}{cat['id_categoria']}/",
            {"nombre": "Análisis", "descripcion": "d", "imagen_portada": imagen("nueva.png")},
            format="multipart",
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertNotEqual(respuesta.data["imagen_portada"], cat["imagen_portada"])
        self.assertEqual(len(self.archivos_subidos()), 1)

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
        self.assertEqual(self.archivos_subidos(), [])

    def test_no_borra_categoria_padre(self):
        padre = self.crear("Padre")
        self.crear("Hija", padres=["padre"])
        self.assertEqual(self.client.delete(f"{URL}{padre['id_categoria']}/").status_code, 400)

    def test_no_borra_categoria_con_notas(self):
        cat = self.crear("Con notas")
        self.db["Nota"].insert_one({"id_documento": "n1", "id_categoria": cat["id_categoria"]})
        self.assertEqual(self.client.delete(f"{URL}{cat['id_categoria']}/").status_code, 400)
