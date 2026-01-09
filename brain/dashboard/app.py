
from flask import Flask
from dashboard.routes import dashboard_bp
from config import DATA_DIR, SESSION_LOGS_DIR
import os


def create_app():
    # Templates and static are in brain/templates and brain/static
    # This file is in brain/dashboard/app.py
    # So we look up one level
    base_dir = os.path.dirname(os.path.abspath(__file__))
    brain_dir = os.path.dirname(base_dir) # brain/
    template_dir = os.path.join(brain_dir, 'templates')

    static_dir = os.path.join(brain_dir, 'static')
    
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable static cache during debug
    
    # Register Blueprint
    app.register_blueprint(dashboard_bp)
    
    return app
