from rest_framework.routers import DefaultRouter

from .views import AvisoViewSet

router = DefaultRouter()
router.register(prefix="avisos", viewset=AvisoViewSet, basename="avisos")

urlpatterns = router.urls
