import os

from flask_caching.backends.rediscache import RedisCache
from sqlalchemy.pool import NullPool

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY")
APP_NAME = "Informes MTS"
HTML_SANITIZATION = False


MCP_SERVICE_HOST = "0.0.0.0"
MCP_SERVICE_PORT = 5008
MCP_AUTH_ENABLED = True
MCP_JWT_ALGORITHM = "HS256"
MCP_JWT_SECRET = os.environ.get("MCP_JWT_SECRET")
MCP_JWT_ISSUER = "mts-superset"
MCP_JWT_AUDIENCE = "mts-superset-users"
MCP_SERVICE_URL = "https://data.mts.com.co"

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
    "pool_size": 10,
    "max_overflow": 5,
    "pool_timeout": 60,
    "pool_pre_ping": True,
    "pool_recycle": 1800,
}
FEATURE_FLAGS = {
    "DATASET_FOLDERS": True,
    "SEMANTIC_LAYERS": True,
    "DASHBOARD_RBAC": True,
    "DASHBOARD_VIRTUALIZATION": False,
    "DASHBOARD_VIRTUALIZATION_DEFER_DATA": False,
    "CSS_TEMPLATES": True,
    "FILTERBAR_CLOSED_BY_DEFAULT": True,
}

D3_FORMAT = {
    "decimal": ",",
    "thousands": ".",
    "grouping": [3],
    "currency": ["$", ""],
}

D3_TIME_FORMAT = {
    "dateTime": "%A, %e de %B de %Y, %X",
    "date": "%d/%m/%Y",
    "time": "%H:%M:%S",
    "periods": ["a. m.", "p. m."],
    "days": ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    "shortDays": ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    "months": [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ],
    "shortMonths": [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
    ],
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

EXTRA_CATEGORICAL_COLOR_SCHEMES = [
    {
        "id": "mtsCorporativo",
        "label": "MTS Corporativo",
        "description": "Azules y grises del One Page Portafolios MTS",
        "isDefault": True,
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
    {
        "id": "mtsCorporativoV2",
        "label": "MTS Corporativo v2",
        "description": "Línea corporativa MTS con tonos diferenciados",
        "isDefault": False,
        "colors": [
            "#1B6FC9",  # Azul MTS
            "#0B2E59",  # Azul marino
            "#00B4D8",  # Cian
            "#6B7E96",  # Gris pizarra
            "#2A9D8F",  # Verde azulado
            "#8EC5F0",  # Azul claro
            "#E09F3E",  # Ámbar
            "#4B4F9C",  # Índigo
            "#7FC8B8",  # Verde agua claro
            "#B8C2CF",  # Gris claro
        ],
    },
]
