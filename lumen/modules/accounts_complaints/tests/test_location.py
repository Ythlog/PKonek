import math

import pytest
from fastapi import HTTPException

from accounts_complaints.config import Settings
from accounts_complaints.services.location import bounding_box, haversine_m, to_wkt, validate_pin

S = Settings(DATABASE_URL="")
PASIG = (14.5764, 121.0851)


def test_valid_pin_inside_pasig():
    assert validate_pin(*PASIG, settings=S) == PASIG


@pytest.mark.parametrize(
    "lat,lng",
    [(None, 121.08), (14.57, None), (None, None), (float("nan"), 121.08), (14.57, float("inf")),
     (95, 121.08), (14.57, 190), (14.5995, 120.9842), (10.0, 123.0)],
)
def test_invalid_or_outside_pin_rejected(lat, lng):
    with pytest.raises(HTTPException) as exc:
        validate_pin(lat, lng, settings=S)
    assert exc.value.status_code == 422


def test_wkt_is_long_lat_order():
    assert to_wkt(14.5764, 121.0851) == "POINT(121.085100 14.576400)"


def test_bounding_box_contains_circle():
    lat, lng = PASIG
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, 50)
    # Points exactly 50 m north/east must be inside the box.
    north = lat + 50 / 111_320
    east = lng + 50 / (111_320 * math.cos(math.radians(lat)))
    assert min_lat < lat < north < max_lat
    assert min_lng < lng < east < max_lng
    # Box isn't absurdly large (< 2x radius margin).
    assert (max_lat - lat) * 111_320 < 100


def test_haversine_distances():
    lat, lng = PASIG
    assert haversine_m(lat, lng, lat, lng) == 0
    d = haversine_m(lat, lng, lat + 30 / 111_320, lng)
    assert 29 < d < 31
