import os

from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/")
def index():
    return jsonify(
        service="scriptforge-backend",
        status="ok",
        endpoints=["/health", "/hello"],
    )


@app.get("/health")
@app.get("/api/health")
def health():
    return jsonify(service="scriptforge-backend", status="ok")


@app.get("/hello")
@app.get("/api/hello")
def hello():
    return jsonify(message="Hello, World!")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)
