"""Required location pin validation and geometry helpers."""
import math

from fastapi import HTTPException, status

from ..config import Settings, get_settings

# Same sphere radius MySQL uses for ST_Distance_Sphere.
EARTH_RADIUS_M = 6_370_986.0
METERS_PER_DEG_LAT = 111_320.0


def validate_pin(lat: float | None, lng: float | None, settings: Settings | None = None) -> tuple[float, float]:
    """Rejects a missing, invalid, or out-of-Pasig pin with HTTP 422."""
    settings = settings or get_settings()

    def reject(msg: str) -> HTTPException:
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=msg)

    if lat is None or lng is None:
        raise reject("A location pin (latitude and longitude) is required.")
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        raise reject("Latitude and longitude must be numbers.")
    if not (math.isfinite(lat) and math.isfinite(lng)):
        raise reject("Latitude and longitude must be finite numbers.")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise reject("Latitude must be -90..90 and longitude -180..180.")
    if not (
        settings.PASIG_MIN_LAT <= lat <= settings.PASIG_MAX_LAT
        and settings.PASIG_MIN_LNG <= lng <= settings.PASIG_MAX_LNG
    ):
        raise reject("The pinned location is outside Pasig City. Please move the pin.")
    return round(lat, 6), round(lng, 6)


def to_wkt(lat: float, lng: float) -> str:
    """WKT in long-lat order; use with ST_GeomFromText(..., 4326, 'axis-order=long-lat')."""
    return f"POINT({lng:.6f} {lat:.6f})"


def bounding_box(lat: float, lng: float, radius_m: float) -> tuple[float, float, float, float]:
    """(min_lat, max_lat, min_lng, max_lng) that fully contains a circle of radius_m.

    Adds a 10% margin so the bbox prefilter never drops a real match.
    """
    r = radius_m * 1.1
    dlat = r / METERS_PER_DEG_LAT
    cos_lat = max(math.cos(math.radians(lat)), 1e-6)
    dlng = r / (METERS_PER_DEG_LAT * cos_lat)
    return lat - dlat, lat + dlat, lng - dlng, lng + dlng


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))
