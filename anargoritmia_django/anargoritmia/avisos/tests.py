from datetime import datetime, timedelta, timezone

from anargoritmia.pruebas_mongo import MongoAPITestCase
from usuarios.repositorio import crear_usuario

URL = "/api/avisos/"


def fecha(dias):
    return (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat()


class AvisosTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.admin = crear_usuario(username="admin", email="admin@example.com", password="x", is_staff=True)
        self.alumna = crear_usuario(username="ada", email="ada@example.com", password="x")

    def crear(self, **datos):
        self.client.force_authenticate(self.admin)
        r = self.client.post(URL, {"titulo": "Aviso", "texto": "Hola", **datos}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.client.force_authenticate(None)
        return r.data

    def test_solo_admin_crea_edita_y_borra(self):
        self.client.force_authenticate(self.alumna)
        self.assertEqual(self.client.post(URL, {"titulo": "X"}, format="json").status_code, 403)
        aviso = self.crear()
        self.client.force_authenticate(self.alumna)
        self.assertEqual(self.client.patch(f"{URL}{aviso['id_aviso']}/", {"titulo": "Y"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(f"{URL}{aviso['id_aviso']}/").status_code, 403)
        self.assertEqual(self.client.get(f"{URL}todos/").status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f"{URL}{aviso['id_aviso']}/", {"titulo": "Y"}, format="json").data["titulo"], "Y")
        self.assertEqual(self.client.delete(f"{URL}{aviso['id_aviso']}/").status_code, 204)

    def test_solo_vigentes_y_en_su_lugar(self):
        self.crear(titulo="Ya pasó", desde=fecha(-10), hasta=fecha(-1))
        self.crear(titulo="Futuro", desde=fecha(2))
        self.crear(titulo="Taller", lugares=["taller"])
        self.crear(titulo="Ahora", desde=fecha(-1), hasta=fecha(1))
        publico = [a["titulo"] for a in self.client.get(URL, {"lugar": "publico"}).data]
        self.assertEqual(publico, ["Ahora"])
        taller = {a["titulo"] for a in self.client.get(URL, {"lugar": "taller"}).data}
        self.assertEqual(taller, {"Ahora", "Taller"})

    def test_orden_fijado_y_urgencia(self):
        self.crear(titulo="Novedad", tipo="novedad")
        self.crear(titulo="Importante", tipo="importante")
        self.crear(titulo="Fijado", tipo="reconocimiento", fijado=True)
        self.assertEqual([a["titulo"] for a in self.client.get(URL).data], ["Fijado", "Importante", "Novedad"])

    def test_historial_incluye_vencidos_pero_no_programados(self):
        self.crear(titulo="Ya pasó", desde=fecha(-10), hasta=fecha(-1))
        self.crear(titulo="Futuro", desde=fecha(2))
        self.assertEqual([a["titulo"] for a in self.client.get(f"{URL}historial/").data], ["Ya pasó"])

    def test_validaciones(self):
        self.client.force_authenticate(self.admin)
        malos = [
            {"titulo": "   "},
            {"titulo": "X", "tipo": "chisme"},
            {"titulo": "X", "lugares": []},
            {"titulo": "X", "lugares": ["portada"]},
            {"titulo": "X", "desde": fecha(2), "hasta": fecha(1)},
        ]
        for datos in malos:
            self.assertEqual(self.client.post(URL, datos, format="json").status_code, 400, datos)
