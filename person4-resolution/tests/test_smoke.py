from fastapi.testclient import TestClient

from resolution.dev_app import app


def test_app_imports_and_smoke_endpoint():
    response = TestClient(app).get("/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "PKonek Lumen Resolution API"
