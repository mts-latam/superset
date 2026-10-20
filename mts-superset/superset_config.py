import os
from sqlalchemy.pool import NullPool
from flask_caching.backends.rediscache import RedisCache

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY")
APP_NAME = "Informes MTS"
HTML_SANITIZATION = False

MCP_AUTH_ENABLED = False
MCP_DEV_USERNAME = "osantos"
MCP_SERVICE_HOST = "0.0.0.0"
MCP_SERVICE_PORT = 5000

DATABASE_DIALECT = os.getenv("DATABASE_DIALECT")
DATABASE_USER = os.getenv("DATABASE_USER")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")
DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_PORT = os.getenv("DATABASE_PORT")
DATABASE_DB = os.getenv("DATABASE_DB")

SQLALCHEMY_DATABASE_URI = (
    f"{DATABASE_DIALECT}://"
    f"{DATABASE_USER}:{DATABASE_PASSWORD}@"
    f"{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_DB}"
)

SQLALCHEMY_ENGINE_OPTIONS = {
    "poolclass": NullPool,
    "pool_pre_ping": False,
}

FEATURE_FLAGS = {
    "DATASET_FOLDERS": True,
    "SEMANTIC_LAYERS": True,
    "DASHBOARD_RBAC": True,
    # 🔥 CRÍTICO: Desactivar virtualización. Si está activo, los charts fuera de la
    # pantalla no se renderizan en el HTML y el PDF sale incompleto.
    "DASHBOARD_VIRTUALIZATION": False,
    "DASHBOARD_VIRTUALIZATION_DEFER_DATA": False,
    "CSS_TEMPLATES": True,
    "FILTERBAR_CLOSED_BY_DEFAULT": True,
}

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_CELERY_DB = os.getenv("REDIS_CELERY_DB", "0")
REDIS_RESULTS_DB = os.getenv("REDIS_RESULTS_DB", "1")

RESULTS_BACKEND = RedisCache(
    host=REDIS_HOST,
    port=int(REDIS_PORT),
    db=int(REDIS_RESULTS_DB),
    key_prefix="superset_results_",
)

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 80000,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": REDIS_HOST,
    "CACHE_REDIS_PORT": int(REDIS_PORT),
    "CACHE_REDIS_DB": int(REDIS_RESULTS_DB),
}
DATA_CACHE_CONFIG = CACHE_CONFIG
THUMBNAIL_CACHE_CONFIG = CACHE_CONFIG

FAB_API_SWAGGER_UI = True
ENABLE_PROXY_FIX = True

# 🔥 TIEMPOS DE ESPERA PARA EL PDF (Para que Chrome espere a los 60 charts)
SUPERSET_WEBSERVER_TIMEOUT = 600  # 10 minutos para Gunicorn
WEBDRIVER_BASEURL = os.getenv("WEBDRIVER_BASEURL", "http://localhost:8088")
WEBDRIVER_TYPE = "chrome"

# Tiempos de espera específicos para que Selenium/Chrome espere el renderizado
SCREENSHOT_LOCATE_WAIT = 100  # Tiempo para localizar el dashboard
SCREENSHOT_LOAD_WAIT = 600  # Tiempo máximo para esperar a que los charts carguen datos
SCREENSHOT_SELENIUM_WAIT_TIMEOUT = 60  # Tiempo para que el navegador esté listo

WEBDRIVER_OPTION_ARGS = [
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
]

EXTRA_CATEGORICAL_COLOR_SCHEMES = [
    {
        "id": "mtsCorporativo",
        "label": "MTS Corporativo",
        "description": "Azules y grises del One Page Portafolios MTS",
        "isDefault": False,
        "colors": [
            "#1B6FC9",
            "#6B7E96",
            "#00B4D8",
            "#9AA9BD",
            "#C3CCD8",
            "#4A90D9",
            "#7EC8E3",
            "#A9AFB8",
            "#4FC3E0",
        ],
    },
]

EXTRA_SEQUENTIAL_COLOR_SCHEMES = [
    {
        "id": "mtsAzules",
        "label": "MTS Azules (claro → oscuro)",
        "description": "Escala secuencial de azules",
        "isDiverging": False,
        "isDefault": False,
        "colors": ["#C3CCD8", "#8FD3EE", "#7DC0E5", "#4FA3D6", "#2E86C9", "#1B6FC9"],
    },
    {
        "id": "mtsGrisAzul",
        "label": "MTS Gris–Azul",
        "description": "Divergente: gris → neutro → azul",
        "isDiverging": True,
        "colors": ["#6B7E96", "#A9AFB8", "#EDF1F5", "#7DC0E5", "#1B6FC9"],
    },
]
