from anargoritmia.pruebas_mongo import MongoAPITestCase as APITestCase

from usuarios.models import Usuario


class AutogestionTests(APITestCase):
    """Endpoint /api/auth/me/: un usuario solo administra sus propios datos."""

    def setUp(self):
        super().setUp()
        self.usuario = Usuario.objects.create_user(
            username="alumno", email="alumno@example.com", password="clave-original-123"
        )
        self.client.force_authenticate(self.usuario)

    def test_no_puede_otorgarse_privilegios(self):
        respuesta = self.client.patch(
            "/api/auth/me/", {"is_staff": True, "is_active": False}, format="json"
        )
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.is_staff)
        self.assertTrue(self.usuario.is_active)

    def test_respuesta_no_expone_password(self):
        respuesta = self.client.get("/api/auth/me/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertNotIn("password", respuesta.data)

    def test_cambio_de_password_se_hashea(self):
        self.client.patch("/api/auth/me/", {"password": "nueva-clave-456"}, format="json")
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password("nueva-clave-456"))

    def test_password_vacia_no_modifica(self):
        self.client.patch("/api/auth/me/", {"password": "", "first_name": "Ada"}, format="json")
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password("clave-original-123"))
        self.assertEqual(self.usuario.first_name, "Ada")


class AdministracionUsuariosTests(APITestCase):
    """Endpoint /api/usuarios/: CRUD reservado a staff."""

    def setUp(self):
        super().setUp()
        self.admin = Usuario.objects.create_user(
            username="admin", email="admin@example.com", password="x", is_staff=True
        )
        self.client.force_authenticate(self.admin)

    def test_crear_hashea_password(self):
        respuesta = self.client.post("/api/usuarios/", {
            "username": "nuevo", "email": "nuevo@example.com", "password": "clave-789",
        }, format="json")
        self.assertEqual(respuesta.status_code, 201)
        self.assertNotIn("password", respuesta.data)
        self.assertTrue(Usuario.objects.get(email="nuevo@example.com").check_password("clave-789"))

    def test_crear_sin_password_responde_400(self):
        respuesta = self.client.post("/api/usuarios/", {
            "username": "nuevo", "email": "nuevo@example.com",
        }, format="json")
        self.assertEqual(respuesta.status_code, 400)

    def test_put_hashea_password(self):
        otro = Usuario.objects.create_user(username="otro", email="otro@example.com", password="x")
        respuesta = self.client.put(f"/api/usuarios/{otro.id}/", {
            "username": "otro", "email": "otro@example.com", "password": "clave-put",
        }, format="json")
        self.assertEqual(respuesta.status_code, 200)
        otro.refresh_from_db()
        self.assertTrue(otro.check_password("clave-put"))

    def test_listado_no_expone_passwords(self):
        respuesta = self.client.get("/api/usuarios/")
        self.assertEqual(respuesta.status_code, 200)
        for usuario in respuesta.data:
            self.assertNotIn("password", usuario)

    def test_no_staff_no_accede(self):
        alumno = Usuario.objects.create_user(username="a", email="a@example.com", password="x")
        self.client.force_authenticate(alumno)
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 403)


class CandadosAdministradorTests(APITestCase):
    """El sistema nunca queda sin administradores y borrar la cuenta exige contraseña."""

    def setUp(self):
        super().setUp()
        self.admin = Usuario.objects.create_user(
            username="admin", email="admin@example.com", password="clave-admin", is_staff=True
        )

    def test_borrar_mi_cuenta_exige_password_correcta(self):
        alumno = Usuario.objects.create_user(username="a", email="a@example.com", password="clave-a")
        self.client.force_authenticate(alumno)
        respuesta = self.client.delete("/api/auth/me/", {"password": "mala"}, format="json")
        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(Usuario.objects.filter(pk=alumno.pk).exists())

        respuesta = self.client.delete("/api/auth/me/", {"password": "clave-a"}, format="json")
        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(Usuario.objects.filter(pk=alumno.pk).exists())

    def test_unico_admin_no_puede_borrarse(self):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.delete("/api/auth/me/", {"password": "clave-admin"}, format="json")
        self.assertEqual(respuesta.status_code, 400)

    def test_unico_admin_no_puede_quitarse_staff(self):
        self.client.force_authenticate(self.admin)
        respuesta = self.client.patch(f"/api/usuarios/{self.admin.id}/", {"is_staff": False}, format="json")
        self.assertEqual(respuesta.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_staff)

    def test_con_otro_admin_si_puede_quitarse_staff(self):
        Usuario.objects.create_user(username="b", email="b@example.com", password="x", is_staff=True)
        self.client.force_authenticate(self.admin)
        respuesta = self.client.patch(f"/api/usuarios/{self.admin.id}/", {"is_staff": False}, format="json")
        self.assertEqual(respuesta.status_code, 200)
