from fastapi import FastAPI

app = FastAPI(title="Lumen API")

@app.get("/health")
def health():
    return {"status": "ok"}
