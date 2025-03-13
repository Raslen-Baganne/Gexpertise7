import os
import logging
from datetime import datetime
from flask import jsonify, current_app, request, send_file
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.user import User
import ezdxf  # Add this import

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création du namespace
ns = Namespace('user-folder', description='Gestion des dossiers utilisateurs')

# Modèles de réponse pour la documentation Swagger
folder_response = ns.model('FolderResponse', {
    'folderExists': fields.Boolean(description="Indique si le dossier existe"),
    'folderName': fields.String(description="Nom du dossier de l'utilisateur"),
    'message': fields.String(description="Message de succès ou d'erreur")
})

folder_files_response = ns.model('FolderFilesResponse', {
    'files': fields.List(fields.Nested(ns.model('File', {
        'name': fields.String(description="Nom du fichier"),
        'size': fields.Integer(description="Taille du fichier en octets"),
        'last_modified': fields.String(description="Date de dernière modification")
    })), description="Liste des fichiers"),
    'message': fields.String(description="Message de succès ou d'erreur")
})

extract_request = ns.model('ExtractRequest', {
    'filename': fields.String(required=True, description="Nom du fichier à extraire")
})

def get_user_email():
    """Récupère l'email de l'utilisateur depuis le JWT ou la base de données."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    email = claims.get('email')

    if not email:
        user = User.query.get(user_id)
        if not user:
            return None
        email = user.email

    return email

@ns.route('')
class UserFolder(Resource):
    @jwt_required()
    @ns.response(200, 'Succès', folder_response)
    @ns.response(400, 'Erreur de requête')
    @ns.response(404, 'Utilisateur non trouvé')
    @ns.response(500, 'Erreur serveur')
    def get(self):
        """Vérifie l'existence du dossier de l'utilisateur"""
        try:
            email = get_user_email()
            if not email:
                return {'error': 'Utilisateur non trouvé'}, 404

            logger.info(f"Checking folder for user: {email}")

            folder_name = email.split('@')[0].replace('.', '_')
            base_resource_path = os.path.abspath(os.path.join(current_app.root_path, '..', 'Ressources'))
            resource_path = os.path.join(base_resource_path, folder_name)
            
            folder_exists = os.path.exists(resource_path)

            logger.info(f"Folder check result for {email}: exists={folder_exists}, path={resource_path}")
            return {
                'folderExists': folder_exists,
                'folderName': folder_name,
                'message': 'Dossier trouvé' if folder_exists else 'Dossier non trouvé'
            }
        except Exception as e:
            logger.error(f"Error in check_user_folder: {str(e)}", exc_info=True)
            return {'error': f'Erreur lors de la vérification du dossier: {str(e)}'}, 500

    @jwt_required()
    @ns.response(201, 'Dossier créé', folder_response)
    @ns.response(200, 'Dossier existant', folder_response)
    @ns.response(400, 'Erreur de requête')
    @ns.response(404, 'Utilisateur non trouvé')
    @ns.response(500, 'Erreur serveur')
    def post(self):
        """Crée un nouveau dossier pour l'utilisateur"""
        try:
            email = get_user_email()
            if not email:
                return {'error': 'Utilisateur non trouvé'}, 404

            logger.info(f"Creating folder for user: {email}")

            folder_name = email.split('@')[0].replace('.', '_')
            base_resource_path = os.path.abspath(os.path.join(current_app.root_path, '..', 'Ressources'))
            resource_path = os.path.join(base_resource_path, folder_name)

            if not os.path.exists(resource_path):
                os.makedirs(resource_path)
                logger.info(f"Created user folder: {resource_path}")
                return {
                    'folderExists': True,
                    'folderName': folder_name,
                    'message': 'Dossier créé avec succès'
                }, 201

            logger.info(f"Folder already exists: {resource_path}")
            return {
                'folderExists': True,
                'folderName': folder_name,
                'message': 'Le dossier existe déjà'
            }, 200

        except Exception as e:
            logger.error(f"Error in create_user_folder: {str(e)}", exc_info=True)
            return {'error': f'Erreur lors de la création du dossier: {str(e)}'}, 500

@ns.route('/files')
class UserFolderFiles(Resource):
    @jwt_required()
    @ns.response(200, 'Succès', folder_files_response)
    @ns.response(400, 'Erreur de requête')
    @ns.response(404, 'Utilisateur ou dossier non trouvé')
    @ns.response(500, 'Erreur serveur')
    def get(self):
        """Liste les fichiers dans le dossier de l'utilisateur"""
        try:
            email = get_user_email()
            if not email:
                return {'error': 'Utilisateur non trouvé'}, 404

            logger.info(f"Listing files for user: {email}")

            folder_name = email.split('@')[0].replace('.', '_')
            base_resource_path = os.path.abspath(os.path.join(current_app.root_path, '..', 'Ressources'))
            resource_path = os.path.join(base_resource_path, folder_name)

            if not os.path.exists(resource_path):
                return {
                    'files': [],
                    'message': 'Dossier non trouvé'
                }, 200

            files = []
            for filename in os.listdir(resource_path):
                file_path = os.path.join(resource_path, filename)
                if os.path.isfile(file_path):
                    files.append({
                        'name': filename,
                        'size': os.path.getsize(file_path),
                        'last_modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                    })

            logger.info(f"Found {len(files)} files in folder: {resource_path}")
            return {
                'files': files,
                'message': 'Fichiers récupérés avec succès'
            }, 200

        except Exception as e:
            logger.error(f"Error in list_user_folder_files: {str(e)}", exc_info=True)
            return {'error': f'Erreur lors de la récupération des fichiers: {str(e)}'}, 500

@ns.route('/extract-data-from-file')
class ExtractDataFromFile(Resource):
    @jwt_required()
    @ns.expect(extract_request)
    @ns.response(200, 'Données extraites')
    @ns.response(400, 'Requête invalide')
    @ns.response(404, 'Fichier non trouvé')
    @ns.response(500, 'Erreur serveur')
    def post(self):
        try:
            email = get_user_email()
            if not email:
                return {'error': 'Utilisateur non trouvé'}, 404

            data = request.get_json()
            filename = data.get('filename')
            if not filename:
                return {'error': 'Nom de fichier requis'}, 400

            folder_name = email.split('@')[0].replace('.', '_')
            base_resource_path = os.path.abspath(os.path.join(current_app.root_path, '..', 'Ressources'))
            file_path = os.path.join(base_resource_path, folder_name, filename)

            if not os.path.exists(file_path):
                return {'error': 'Fichier non trouvé'}, 404

            # Parse the DXF file using ezdxf
            doc = ezdxf.readfile(file_path)
            msp = doc.modelspace()

            # Extract layers
            layers = [{'name': layer.dxf.name, 'color': layer.dxf.color if layer.dxf.color else 'N/A'} for layer in doc.layers]

            # Extract entities dynamically like file_service.py
            polylines = []
            lines = []
            circles = []
            arcs = []
            texts = []

            for entity in msp.query('*'):
                dxftype = entity.dxftype()
                if dxftype in ['POLYLINE', 'LWPOLYLINE']:
                    vertices = ([{'x': v[0], 'y': v[1]} for v in entity.points()] if dxftype == 'POLYLINE'
                                else [{'x': v[0], 'y': v[1]} for v in entity.get_points()])
                    polylines.append({
                        'type': dxftype,
                        'layer': entity.dxf.layer,
                        'vertices': vertices,
                        'closed': entity.closed
                    })
                elif dxftype == 'LINE':
                    lines.append({'type': dxftype, 'layer': entity.dxf.layer})
                elif dxftype == 'CIRCLE':
                    circles.append({'type': dxftype, 'layer': entity.dxf.layer, 'radius': entity.dxf.radius})
                elif dxftype == 'ARC':
                    arcs.append({'type': dxftype, 'layer': entity.dxf.layer})
                elif dxftype == 'TEXT':
                    texts.append({'type': dxftype, 'layer': entity.dxf.layer, 'text': entity.dxf.text})

            # Statistics
            extracted_data = {
                'statistics': {
                    'layer_count': len(layers),
                    'polyline_count': len(polylines),
                    'line_count': len(lines),
                    'circle_count': len(circles),
                    'arc_count': len(arcs),
                    'text_count': len(texts),
                    'total_entities': len(msp)
                },
                'layers': layers,
                'polylines': polylines,
                'lines': lines,
                'circles': circles,
                'arcs': arcs,
                'texts': texts
            }

            logger.info(f"Extracted data from file: {file_path}")
            return extracted_data, 200

        except Exception as e:
            logger.error(f"Error in extract_data_from_file: {str(e)}", exc_info=True)
            return {'error': f'Erreur lors de l\'extraction des données: {str(e)}'}, 500