from flask import request
from flask_restx import Namespace, Resource, fields, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.user_service import create_user, get_users, get_user_by_id, update_user, delete_user, get_users_with_folders
from app.services.folder_service import populate_folders_from_resources
from app import db
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ns = Namespace("users", description="Gestion des utilisateurs")

user_model = ns.model("User", {
    "id": fields.Integer(readonly=True),
    "nom": fields.String(required=True),
    "prenom": fields.String(required=True),
    "email": fields.String(required=True, description="L'email de l'utilisateur", example="user@example.com"),
    "password": fields.String(required=True, description="Le mot de passe de l'utilisateur", example="motdepasse123"),
    "role": fields.String(required=True, description="Le rôle de l'utilisateur", example="user")
})

@ns.route("/")
class UserList(Resource):
    @ns.marshal_list_with(user_model)
    def get(self):
        """Récupère la liste des utilisateurs"""
        logger.info("GET request received for user list")
        return get_users()

    @ns.expect(user_model)
    @ns.marshal_with(user_model, code=201)
    def post(self):
        """Crée un nouvel utilisateur"""
        logger.info("POST request received to create a new user")
        data = request.json
        if not data.get("email"):
            abort(400, "Email requis")
        if not data.get("password"):
            abort(400, "Mot de passe requis")
        return create_user(data["nom"], data["prenom"], data["email"], data["password"], data["role"]), 201

@ns.route("/<int:user_id>")
@ns.param("user_id", "L'identifiant de l'utilisateur")
class UserResource(Resource):
    @ns.marshal_with(user_model)
    def get(self, user_id):
        """Récupère un utilisateur par son identifiant"""
        logger.info(f"GET request received for user ID {user_id}")
        user = get_user_by_id(user_id)
        if user:
            return user
        abort(404, "Utilisateur non trouvé")

    @ns.expect(user_model)
    @ns.marshal_with(user_model)
    def put(self, user_id):
        """Met à jour les informations d'un utilisateur ou son dossier"""
        logger.info(f"PUT request received for user ID {user_id}")
        user = get_user_by_id(user_id)
        if not user:
            abort(404, "Utilisateur non trouvé")
        
        data = request.json
        updated_user = update_user(user_id, data)
        if updated_user:
            return updated_user
        abort(500, "Échec de la mise à jour de l'utilisateur")

    @jwt_required()
    def delete(self, user_id):
        """Supprime un utilisateur et son dossier personnel dans la base de données et dans Ressources."""
        logger.info(f"DELETE request received for user ID {user_id} by user ID {get_jwt_identity()}")
        current_user_id = get_jwt_identity()
        current_user = get_user_by_id(current_user_id)

        # Autoriser les admins ou l'utilisateur lui-même
        if current_user.role != 'admin' and current_user_id != user_id:
            logger.warning(f"Permission denied for user ID {current_user_id} to delete user ID {user_id}")
            abort(403, "Seul un admin ou l'utilisateur lui-même peut supprimer ce compte")

        user = get_user_by_id(user_id)
        if not user:
            logger.error(f"User ID {user_id} not found")
            abort(404, "Utilisateur non trouvé")

        try:
            success = delete_user(user_id)  # Supprime l'utilisateur et son dossier
            if success:
                logger.info(f"Utilisateur ID {user_id} et son dossier supprimés avec succès")
                return {"message": "Utilisateur et dossier supprimés avec succès"}, 200
            else:
                logger.error(f"Failed to delete user ID {user_id}")
                abort(500, "Échec de la suppression de l'utilisateur")
        except Exception as e:
            logger.error(f"Erreur lors de la suppression pour l'utilisateur ID {user_id}: {str(e)}")
            abort(500, f"Erreur lors de la suppression: {str(e)}")

@ns.route("/<int:user_id>/password")
@ns.param("user_id", "L'identifiant de l'utilisateur")
class UserPasswordResource(Resource):
    @ns.expect(ns.model("PasswordUpdate", {
        "currentPassword": fields.String(required=True, description="Mot de passe actuel"),
        "newPassword": fields.String(required=True, description="Nouveau mot de passe")
    }))
    @jwt_required()
    def put(self, user_id):
        """Met à jour le mot de passe d'un utilisateur"""
        logger.info(f"PUT request received to update password for user ID {user_id}")
        current_user_id = get_jwt_identity()
        if current_user_id != user_id:
            abort(403, "Vous n'êtes pas autorisé à modifier ce compte")

        data = request.json
        user = get_user_by_id(user_id)
        if not user:
            abort(404, "Utilisateur non trouvé")

        try:
            decrypted_password = user.decrypt_password(user.password)
            if decrypted_password != data["currentPassword"]:
                abort(400, "Mot de passe actuel incorrect")
        except ValueError:
            abort(400, "Erreur lors de la vérification du mot de passe")

        user.password = user.encrypt_password(data["newPassword"])
        db.session.commit()
        return {"message": "Mot de passe mis à jour avec succès"}, 200

@ns.route("/users-with-folders")
class UsersWithFolders(Resource):
    @jwt_required()
    def get(self):
        """Récupère tous les utilisateurs avec leurs dossiers après synchronisation avec Ressources."""
        try:
            logger.info("GET request received for users-with-folders")
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Ressources'))
            logger.info(f"Calling populate_folders_from_resources with path: {base_resource_path}")
            populate_folders_from_resources(base_resource_path)
            result = get_users_with_folders()
            logger.info(f"Returning users with folders: {len(result)} entries")
            return result
        except Exception as e:
            logger.error(f"Error in users-with-folders: {str(e)}")
            abort(500, f"Erreur lors de la récupération des utilisateurs et dossiers: {str(e)}")