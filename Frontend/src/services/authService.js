import axios from "axios";

// URL de l'API pour l'authentification
const API_URL = "http://localhost:5000/api/auth/";

// Fonction pour sauvegarder le token et les infos utilisateur dans localStorage
const saveToken = (token, user) => {
    localStorage.clear();  // Clear all previous data
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
};

// Fonction pour récupérer le token depuis localStorage
const getToken = () => {
    return localStorage.getItem('token');
};

// Fonction pour récupérer les informations de l'utilisateur
const getUser = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        
        const user = JSON.parse(userStr);
        // Ensure we have the required fields
        if (!user || !user.role) return null;
        
        return user;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
};

// Fonction pour supprimer le token (déconnexion)
const removeToken = () => {
    localStorage.clear();  // Clear all stored data
};

// Fonction pour vérifier si l'utilisateur est connecté
const isAuthenticated = () => {
    const token = getToken();
    const user = getUser();
    return !!(token && user);
};

// Configuration d'axios avec le token
const setupAxiosInterceptors = () => {
    axios.interceptors.request.use(
        (config) => {
            const token = getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );
};

// Fonction pour effectuer la connexion
export const login = async (email, password) => {
    try {
        // Clear any existing auth data before login
        removeToken();
        
        const response = await axios.post(`${API_URL}login`, { email, password });
        const { access_token, user } = response.data;
        
        // Sauvegarder le token et les informations utilisateur
        saveToken(access_token, user);
        
        // Configurer axios avec le nouveau token
        setupAxiosInterceptors();
        
        return { role: user.role };
    } catch (error) {
        console.error("Erreur de connexion :", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Erreur de connexion");
    }
};

// Fonction pour récupérer le profil utilisateur
export const getCurrentUser = async () => {
    try {
        const response = await axios.get(`${API_URL}me`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération du profil :", error);
        if (error.response?.status === 401) {
            // Token invalide ou expiré
            removeToken();
        }
        throw error;
    }
};

// Fonction pour l'inscription
const signup = async (userData) => {
    try {
        const response = await axios.post(API_URL + 'signup', userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Une erreur est survenue lors de l'inscription" };
    }
};

// Fonction de déconnexion
export const logout = () => {
    removeToken();
};

// Initialiser les intercepteurs
setupAxiosInterceptors();

export { getToken, getUser, isAuthenticated, saveToken, removeToken, signup };