from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.file_service import extract_file_data
import logging
import os
from app.models.user import User
from datetime import datetime
import shutil
import json
from werkzeug.datastructures import FileStorage
import io

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

file_blueprint = Blueprint("file", __name__)

def get_user_folder_path():
    """Récupère le chemin du dossier utilisateur basé sur l'email."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    email = claims.get('email')

    if not email:
        user = User.query.get(user_id)
        if not user:
            return None
        email = user.email

    folder_name = email.split('@')[0].replace('.', '_')
    base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Ressources'))
    return os.path.join(base_resource_path, folder_name)

def get_folder_structure(base_path, relative_path=""):
    """Récupère récursivement la structure des dossiers et fichiers."""
    folder_structure = {"folders": [], "files": []}
    
    try:
        full_path = os.path.join(base_path, relative_path)
        if not os.path.exists(full_path):
            logger.debug(f"Folder does not exist: {full_path}")
            return folder_structure

        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            rel_item_path = os.path.join(relative_path, item) if relative_path else item

            if os.path.isdir(item_path):
                folder_info = {
                    "name": item,
                    "path": rel_item_path,
                    "last_modified": datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat(),
                    "size": sum(os.path.getsize(os.path.join(item_path, f)) for f in os.listdir(item_path) if os.path.isfile(os.path.join(item_path, f))),
                    "sub_structure": get_folder_structure(base_path, rel_item_path)
                }
                folder_structure["folders"].append(folder_info)
            elif os.path.isfile(item_path) and item.lower().endswith('.dxf'):
                file_info = {
                    "name": item,
                    "path": rel_item_path,
                    "size": os.path.getsize(item_path),
                    "last_modified": datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat()
                }
                folder_structure["files"].append(file_info)

        return folder_structure
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de la structure : {str(e)}", exc_info=True)
        return folder_structure

@file_blueprint.route("/api/upload", methods=["POST"])
@cross_origin()
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        logger.error("Aucun fichier reçu dans la requête")
        return jsonify({"error": "Aucun fichier reçu"}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("Nom de fichier invalide")
        return jsonify({"error": "Nom de fichier invalide"}), 400
    
    logger.debug(f"Fichier reçu : {file.filename}")
    if not file.filename.lower().endswith('.dxf'):
        logger.error(f"Format non supporté : {file.filename}")
        return jsonify({"error": "Seuls les fichiers .dxf sont acceptés"}), 400

    user_folder_path = get_user_folder_path()
    if not user_folder_path or not os.path.exists(user_folder_path):
        logger.error("Dossier utilisateur non trouvé ou inaccessible")
        return jsonify({"error": "Dossier utilisateur non trouvé"}), 400

    file_path = os.path.join(user_folder_path, file.filename)
    file.save(file_path)
    logger.debug(f"Fichier sauvegardé dans : {file_path}")

    return jsonify({"message": "Fichier .dxf reçu et sauvegardé", "filename": file.filename, "path": file_path}), 200

@file_blueprint.route("/api/extract-data", methods=["POST"])
@cross_origin()
@jwt_required()
def extract_data():
    if 'file' not in request.files:
        logger.error("Aucun fichier reçu dans la requête")
        return jsonify({"error": "Aucun fichier reçu"}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("Nom de fichier invalide")
        return jsonify({"error": "Nom de fichier invalide"}), 400
    
    logger.debug(f"Extraction des données pour : {file.filename}")
    if not file.filename.lower().endswith('.dxf'):
        logger.error(f"Format non supporté : {file.filename}")
        return jsonify({"error": "Seuls les fichiers .dxf sont acceptés"}), 400
    
    result = extract_file_data(file)
    if "error" in result:
        logger.error(f"Erreur d'extraction : {result['error']}")
        return jsonify(result), 400
    
    logger.debug("Données extraites avec succès")
    return jsonify(result), 200

@file_blueprint.route("/api/transfer-files", methods=["POST"])
@cross_origin()
@jwt_required()
def transfer_files():
    try:
        if 'file1' not in request.files or 'file2' not in request.files:
            logger.error("Deux fichiers sont requis")
            return jsonify({"error": "Deux fichiers sont requis pour le transfert"}), 400

        file1 = request.files['file1']
        file2 = request.files['file2']
        filename1 = request.form.get('filename1')
        filename2 = request.form.get('filename2')
        custom_folder_name = request.form.get('customFolderName')  # Récupérer le nom personnalisé

        if not filename1 or not filename2 or not custom_folder_name:
            logger.error("Noms de fichiers ou nom de dossier personnalisé manquants")
            return jsonify({"error": "Noms de fichiers et nom de dossier personnalisé requis"}), 400

        user_folder_path = get_user_folder_path()
        if not user_folder_path or not os.path.exists(user_folder_path):
            logger.error("Dossier utilisateur non trouvé ou inaccessible")
            return jsonify({"error": "Dossier utilisateur non trouvé"}), 400

        transfer_folder = os.path.join(user_folder_path, custom_folder_name)  # Utiliser le nom personnalisé
        os.makedirs(transfer_folder, exist_ok=True)
        logger.debug(f"Dossier de transfert créé : {transfer_folder}")

        file1_path = os.path.join(transfer_folder, filename1)
        file2_path = os.path.join(transfer_folder, filename2)
        
        file1.save(file1_path)
        file2.save(file2_path)
        logger.debug(f"Fichiers sauvegardés : {file1_path}, {file2_path}")

        return jsonify({"message": f"Fichiers transférés avec succès dans {custom_folder_name}"}), 200

    except Exception as e:
        logger.error(f"Erreur lors du transfert : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur lors du transfert : {str(e)}"}), 500

@file_blueprint.route("/api/user-folder/files", methods=["GET"])
@cross_origin()
@jwt_required()
def get_user_folder_files():
    try:
        user_folder_path = get_user_folder_path()
        if not user_folder_path or not os.path.exists(user_folder_path):
            logger.error("Dossier utilisateur non trouvé ou inaccessible")
            return jsonify({"error": "Dossier utilisateur non trouvé"}), 400

        folder_structure = get_folder_structure(user_folder_path)
        logger.debug(f"Folder structure returned: {json.dumps(folder_structure, indent=2)}")
        return jsonify(folder_structure), 200

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des fichiers : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500

@file_blueprint.route("/api/user-folder/extract-data-from-file", methods=["POST"])
@cross_origin()
@jwt_required()
def extract_data_from_file():
    try:
        data = request.get_json()
        filename = data.get("filename")
        folder = data.get("folder", "")  # Path relative to user folder

        if not filename:
            logger.error("Nom de fichier manquant")
            return jsonify({"error": "Nom de fichier requis"}), 400

        user_folder_path = get_user_folder_path()
        if not user_folder_path or not os.path.exists(user_folder_path):
            logger.error("Dossier utilisateur non trouvé ou inaccessible")
            return jsonify({"error": "Dossier utilisateur non trouvé"}), 400

        file_path = os.path.join(user_folder_path, folder, filename) if folder else os.path.join(user_folder_path, filename)
        logger.debug(f"Received filename: {filename}, folder: {folder}")
        logger.debug(f"Constructed file path: {file_path}")

        if not os.path.exists(file_path):
            logger.error(f"Fichier non trouvé : {file_path}")
            return jsonify({"error": f"Fichier non trouvé : {filename}"}), 404

        # Open the file and wrap it as a FileStorage object
        with open(file_path, 'rb') as f:
            file_content = f.read()  # Read the entire file content
            file_obj = FileStorage(
                stream=io.BytesIO(file_content),  # Wrap in BytesIO for FileStorage
                filename=filename,
                content_type='application/octet-stream'  # Generic binary type
            )
            result = extract_file_data(file_obj)

        if "error" in result:
            logger.error(f"Erreur d'extraction : {result['error']}")
            return jsonify(result), 400

        logger.debug(f"Données extraites pour : {filename}")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Erreur lors de l'extraction : {str(e)}", exc_info=True)
        return jsonify({"error": f"Erreur serveur : {str(e)}"}), 500