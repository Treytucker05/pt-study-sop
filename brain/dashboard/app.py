from flask import Flask, send_from_directory

from dashboard.routes import dashboard_bp
from dashboard.v3_routes import dashboard_v3_bp, dashboard_v3_api_bp
from config import DATA_DIR, SESSION_LOGS_DIR
import os
import time


def create_app():
    # Templates and static are in brain/templates and brain/static
    # This file is in brain/dashboard/app.py
    # So we look up one level
    base_dir = os.path.dirname(os.path.abspath(__file__))
    brain_dir = os.path.dirname(base_dir)  # brain/
    template_dir = os.path.join(brain_dir, "templates")

    static_dir = os.path.join(brain_dir, "static")

    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0  # Disable static cache during debug

    # Register blueprints BEFORE catch-all route
    from dashboard.routes import dashboard_bp
    from dashboard.v3_routes import dashboard_v3_bp, dashboard_v3_api_bp
    from dashboard.api_adapter import adapter_bp

    app.register_blueprint(adapter_bp)  # /api/* routes - must be first
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(dashboard_v3_bp)
    app.register_blueprint(dashboard_v3_api_bp)

    # Serve React App (catch-all for non-API routes)
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        # Skip API paths - they're handled by blueprints
        if path.startswith("api/"):
            return "API route not found", 404

        if path:
            # Serve files directly from /static when they exist
            static_candidate = os.path.join(app.static_folder or "", path)
            if os.path.exists(static_candidate):
                return send_from_directory(app.static_folder or "", path)

            # Serve React build assets from /static/react
            react_candidate = os.path.join(app.static_folder or "", "react", path)
            if os.path.exists(react_candidate):
                return send_from_directory(
                    os.path.join(app.static_folder or "", "react"), path
                )

            # Serve Vite dist assets from /static/dist
            dist_candidate = os.path.join(app.static_folder or "", "dist", path)
            if os.path.exists(dist_candidate):
                return send_from_directory(
                    os.path.join(app.static_folder or "", "dist"), path
                )

        dist_index = os.path.join(app.static_folder or "", "dist", "index.html")
        if os.path.exists(dist_index):
            return send_from_directory(
                os.path.join(app.static_folder or "", "dist"), "index.html"
            )

        return send_from_directory(
            os.path.join(app.static_folder or "", "react"), "index.html"
        )

    # Hot reload disabled to prevent dev reload loops

    # Add cache-busting headers for all responses
    @app.after_request
    def add_header(response):
        # Prevent caching of all responses in development
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "-1"
        return response

    # Add timestamp to all templates for cache busting
    @app.context_processor
    def inject_cache_buster():
        return dict(cache_bust=int(time.time()))

    return app
