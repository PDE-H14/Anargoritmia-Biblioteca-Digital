"""
URL configuration for anargoritmia project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import re_path,  path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from anargoritmia.red import DiagnosticoIPView

schema_view = get_schema_view(
   openapi.Info(
      title="Anargoritmia API",
      default_version='v1',
      description="Documentación de la API de Anargoritmia",
      terms_of_service="",
      contact=openapi.Contact(email="escamilla.huerta.porfirio@gmail.local"),
      license=openapi.License(name="AGPL-3.0", url="https://www.gnu.org/licenses/agpl-3.0.html"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('doc/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    # Entrar, renovar y salir: /api/auth/login|renovar|salir/ (usuarios/api/router.py)
    path("api/", include("usuarios.api.router")),
    path("api/", include("notas.api.router")),
    path("api/", include("categorias.api.router")),
    path("api/diagnostico/ip/", DiagnosticoIPView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)