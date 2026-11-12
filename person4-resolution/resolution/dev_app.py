"""Standalone development app for local integration and smoke checks."""

from fastapi import FastAPI

from .api import register

app = FastAPI(title="PKonek Lumen Resolution API")
register(app)

