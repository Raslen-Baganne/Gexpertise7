from app.models.user import User
from app import db
from app.models.folder import Folder
import os
import shutil
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_user(nom, prenom, email, password, role):
    user = User(nom=nom, prenom=prenom, email=email, password=password, role=role)
    db.session.add(user)
    db.session.commit()
    return user

def get_users():
    return User.query.all()

def get_user_by_id(user_id):
    return User.query.get(user_id)

def update_user(user_id, data):
    user = get_user_by_id(user_id)
    if not user:
        logger.error(f"Utilisateur avec ID {user_id} non trouvé.")
        return None
    
    old_folder_name = None
    if user.folders:
        old_folder_name = user.folders[0].nom_dossier
    
    for key, value in data.items():
        if key == 'password' and value == 'unchanged':
            continue
        elif key == 'folderName' and user.folders:
            folder = user.folders[0]
            folder.nom_dossier = value
            base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Ressources'))
            old_path = os.path.join(base_resource_path, old_folder_name)
            new_path = os.path.join(base_resource_path, value)
            if os.path.exists(old_path) and old_folder_name != value:
                os.rename(old_path, new_path)
        else:
            setattr(user, key, value)
    db.session.commit()
    return user

def delete_user(user_id):
    logger.info(f"Tentative de suppression du dossier pour l'utilisateur ID {user_id}")
    user = get_user_by_id(user_id)
    if not user:
        logger.error(f"Utilisateur avec ID {user_id} non trouvé.")
        return False

    if not user.folders:
        logger.warning(f"Aucun dossier trouvé pour l'utilisateur ID {user_id}.")
        return True  # Rien à supprimer, mais succès car l'état est cohérent

    folder = user.folders[0]
    folder_name = folder.nom_dossier
    # Vérification supplémentaire : générer le nom basé sur l'email pour cohérence
    expected_folder_name = user.email.split('@')[0].replace('.', '_')
    if folder_name != expected_folder_name:
        logger.warning(f"Nom de dossier en base ({folder_name}) différent du nom attendu ({expected_folder_name}). Utilisation du nom attendu.")
        folder_name = expected_folder_name

    base_resource_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Ressources'))
    folder_path = os.path.join(base_resource_path, folder_name)

    # Supprimer le dossier physique
    if os.path.exists(folder_path):
        try:
            shutil.rmtree(folder_path)
            logger.info(f"Dossier {folder_path} supprimé avec succès de Ressources.")
        except PermissionError as e:
            logger.error(f"Permission refusée pour supprimer {folder_path}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du dossier {folder_path}: {str(e)}")
            return False

    # Supprimer l'entrée dans la base de données
    try:
        db.session.delete(folder)
        db.session.commit()
        logger.info(f"Entrée du dossier {folder_name} supprimée de la base de données pour l'utilisateur ID {user_id}.")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de l'entrée folder dans la base de données: {str(e)}")
        db.session.rollback()
        return False

def authenticate_user(email, password):
    user = User.query.filter_by(email=email).first()
    if not user:
        return None
    try:
        decrypted_password = user.decrypt_password(user.password)
        if decrypted_password == password:
            return user
    except ValueError as e:
        print(f"Erreur de déchiffrement: {e}")
        return None
    return None

def get_users_with_folders():
    users = User.query.filter_by(role='user').all()
    result = []
    for user in users:
        folders = Folder.query.filter_by(id_user=user.id).all()
        if folders:
            folder = folders[0]
            result.append({
                "user_id": user.id,
                "nom": user.nom,
                "prenom": user.prenom,
                "email": user.email,
                "folder_id": folder.id,
                "nom_dossier": folder.nom_dossier,
                "date_creation": folder.date_creation.isoformat() if folder.date_creation else None
            })
        else:
            result.append({
                "user_id": user.id,
                "nom": user.nom,
                "prenom": user.prenom,
                "email": user.email,
                "folder_id": None,
                "nom_dossier": None,
                "date_creation": None
            })
    return result