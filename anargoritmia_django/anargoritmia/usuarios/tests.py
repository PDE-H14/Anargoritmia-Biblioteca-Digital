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
        respuesta = self.client.patch(
            "/api/auth/me/",
            {"password": "nueva-clave-456", "password_actual": "clave-original-123"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password("nueva-clave-456"))

    def test_cambio_de_password_exige_la_actual(self):
        for actual in (None, "equivocada"):
            datos = {"password": "nueva-clave-456"}
            if actual:
                datos["password_actual"] = actual
            respuesta = self.client.patch("/api/auth/me/", datos, format="json")
            self.assertEqual(respuesta.status_code, 400)
            self.assertIn("password_actual", respuesta.data)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password("clave-original-123"))

    def test_firma_por_omision_es_alias(self):
        respuesta = self.client.get("/api/auth/me/")
        self.assertEqual(respuesta.data["firma"], "alias")

    def test_firma_invalida_400(self):
        respuesta = self.client.patch("/api/auth/me/", {"firma": "apodo"}, format="json")
        self.assertEqual(respuesta.status_code, 400)

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


class SesionesJWTTests(APITestCase):
    """Acceso corto, renovación que rota, salida y cambio de contraseña revocan sesiones."""

    def setUp(self):
        super().setUp()
        self.usuario = Usuario.objects.create_user(
            username="ada", email="ada@example.com", password="clave-original-123"
        )

    def entrar(self):
        respuesta = self.client.post(
            "/api/auth/login/", {"email": "ada@example.com", "password": "clave-original-123"}, format="json"
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        return respuesta.data

    def renovar(self, refresh):
        return self.client.post("/api/auth/renovar/", {"refresh": refresh}, format="json")

    def test_acceso_dura_quince_minutos(self):
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(self.entrar()["access"])
        self.assertLessEqual(token["exp"] - token["iat"], 15 * 60)

    def test_renovar_rota_y_revoca_el_anterior(self):
        tokens = self.entrar()
        nuevo = self.renovar(tokens["refresh"])
        self.assertEqual(nuevo.status_code, 200)
        self.assertIn("refresh", nuevo.data)
        self.assertNotEqual(nuevo.data["refresh"], tokens["refresh"])
        self.assertEqual(self.renovar(tokens["refresh"]).status_code, 401)

    def test_salir_revoca_la_renovacion(self):
        tokens = self.entrar()
        self.assertEqual(self.client.post("/api/auth/salir/", {"refresh": tokens["refresh"]}, format="json").status_code, 200)
        self.assertEqual(self.renovar(tokens["refresh"]).status_code, 401)

    def test_cambiar_password_revoca_otras_sesiones_y_entrega_tokens(self):
        otro_dispositivo = self.entrar()
        este = self.entrar()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {este['access']}")
        respuesta = self.client.patch(
            "/api/auth/me/", {"password": "nueva-clave-456", "password_actual": "clave-original-123"}, format="json"
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertIn("tokens", respuesta.data)
        self.client.credentials()
        self.assertEqual(self.renovar(otro_dispositivo["refresh"]).status_code, 401)
        self.assertEqual(self.renovar(este["refresh"]).status_code, 401)
        self.assertEqual(self.renovar(respuesta.data["tokens"]["refresh"]).status_code, 200)

    def test_admin_desactiva_y_cierra_sesiones(self):
        tokens = self.entrar()
        admin = Usuario.objects.create_user(username="admin", email="admin@example.com", password="x", is_staff=True)
        self.client.force_authenticate(admin)
        self.client.patch(f"/api/usuarios/{self.usuario.id}/", {"is_active": False}, format="json")
        self.client.force_authenticate(None)
        self.assertEqual(self.renovar(tokens["refresh"]).status_code, 401)

    def test_token_firmado_con_la_clave_anterior_se_rechaza(self):
        import jwt
        from django.conf import settings
        from datetime import datetime, timedelta, timezone
        viejo = jwt.encode(
            {"token_type": "access", "user_id": str(self.usuario.id), "jti": "x",
             "exp": datetime.now(timezone.utc) + timedelta(days=100)},
            settings.SECRET_KEY, algorithm="HS256",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {viejo}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)


class RegistroTests(APITestCase):
    """Alta abierta: cualquiera crea su cuenta, pero nunca como administrador."""

    URL = "/api/auth/registro/"
    DATOS = {"username": "nueva", "email": "Nueva@Example.com", "password": "una-clave-larga-2026"}

    def test_crea_cuenta_activa_sin_privilegios_y_entrega_tokens(self):
        respuesta = self.client.post(self.URL, self.DATOS, format="json")
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        usuario = Usuario.objects.get(username="nueva")
        self.assertTrue(usuario.is_active)
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertEqual(usuario.email, "nueva@example.com")
        self.assertTrue(usuario.check_password("una-clave-larga-2026"))
        self.assertNotIn("password", respuesta.data)
        self.assertIn("access", respuesta.data["tokens"])
        # El token sirve de inmediato
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {respuesta.data['tokens']['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").data["username"], "nueva")

    def test_no_puede_registrarse_como_administrador(self):
        datos = {**self.DATOS, "is_staff": True, "is_superuser": True}
        self.assertEqual(self.client.post(self.URL, datos, format="json").status_code, 201)
        usuario = Usuario.objects.get(username="nueva")
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)

    def test_correo_y_alias_repetidos_400(self):
        Usuario.objects.create_user(username="otra", email="nueva@example.com", password="x")
        respuesta = self.client.post(self.URL, self.DATOS, format="json")
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("email", respuesta.data)
        respuesta = self.client.post(self.URL, {**self.DATOS, "username": "OTRA", "email": "b@example.com"}, format="json")
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("username", respuesta.data)

    def test_contrasena_debil_400(self):
        for clave in ("corta", "12345678901", "password123"):
            respuesta = self.client.post(self.URL, {**self.DATOS, "password": clave}, format="json")
            self.assertEqual(respuesta.status_code, 400, clave)
            self.assertIn("password", respuesta.data)
        self.assertFalse(Usuario.objects.filter(username="nueva").exists())

    def test_cuenta_nueva_no_entra_al_panel_de_usuarios(self):
        tokens = self.client.post(self.URL, self.DATOS, format="json").data["tokens"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 403)
