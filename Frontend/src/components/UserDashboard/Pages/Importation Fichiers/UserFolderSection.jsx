import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, message, Alert, Space, Typography, Spin, Input } from 'antd';
import { FolderOutlined, FolderAddOutlined, LoginOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;

const UserFolderSection = ({ successfulUploads, onTransfer }) => {
    const [folderExists, setFolderExists] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customFolderName, setCustomFolderName] = useState(''); // État pour le nom personnalisé

    const isAuthenticated = () => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            return expiry > Date.now();
        } catch (e) {
            console.error('Erreur lors de la vérification du token:', e);
            return false;
        }
    };

    const checkUserFolder = async () => {
        if (!isAuthenticated()) {
            setError('Veuillez vous connecter pour accéder à votre dossier');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.get('/api/user-folder', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.data.error) {
                throw new Error(response.data.error);
            }

            setFolderExists(response.data.folderExists);
            setFolderName(response.data.folderName);
            setError(null);

            if (response.data.message) {
                message.info(response.data.message);
            }
        } catch (error) {
            console.error('Erreur complète:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de la vérification du dossier';
            setError(errorMessage);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const createUserFolder = async () => {
        if (!isAuthenticated()) {
            setError('Veuillez vous connecter pour créer un dossier');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.post('/api/user-folder', {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.data.error) {
                throw new Error(response.data.error);
            }

            setFolderExists(response.data.folderExists);
            setFolderName(response.data.folderName);
            setError(null);
            message.success(response.data.message || 'Dossier créé avec succès');
        } catch (error) {
            console.error('Erreur complète:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de la création du dossier';
            setError(errorMessage);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleTransferWithCustomName = () => {
        if (!customFolderName.trim()) {
            message.error('Veuillez entrer un nom de dossier valide.');
            return;
        }
        onTransfer(customFolderName); // Passer le nom personnalisé à la fonction de transfert
        setCustomFolderName(''); // Réinitialiser le champ après transfert
    };

    useEffect(() => {
        checkUserFolder();
    }, []);

    if (!isAuthenticated()) {
        return (
            <Card
                title={<Title level={4} style={{ color: '#0052cc' }}>Votre Dossier Personnel</Title>}
                bordered={false}
                style={{
                    height: '100%',
                    minHeight: '400px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
            >
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <LoginOutlined style={{ fontSize: '32px', color: '#0052cc' }} />
                    <Text style={{ color: '#6b7280' }}>Veuillez vous connecter pour accéder à votre dossier</Text>
                    <Button type="primary" href="/login" icon={<LoginOutlined />} style={{ backgroundColor: '#0052cc', border: 'none', borderRadius: '8px' }}>
                        Se connecter
                    </Button>
                </Space>
            </Card>
        );
    }

    return (
        <Card
            title={<Title level={4} style={{ color: '#0052cc' }}>Votre Dossier Personnel</Title>}
            bordered={false}
            style={{
                height: '100%',
                minHeight: '400px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}
            extra={
                <Button
                    type="text"
                    icon={<ReloadOutlined style={{ transition: 'transform 0.5s', transform: loading ? 'rotate(360deg)' : 'none' }} />}
                    onClick={checkUserFolder}
                    loading={loading}
                >
                    Rafraîchir
                </Button>
            }
        >
            {error && (
                <Alert
                    message="Erreur"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: '8px' }}
                />
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" />
                    <Text style={{ display: 'block', marginTop: '10px', color: '#6b7280' }}>
                        Chargement de votre dossier...
                    </Text>
                </div>
            ) : folderExists ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FolderOutlined style={{ fontSize: '24px', color: '#0052cc' }} />
                        <Text strong style={{ color: '#000000d9' }}>Votre dossier est prêt :</Text>
                        <Text code>{folderName}</Text>
                    </div>
                    <Text style={{ color: '#6b7280' }}>
                        Entrez un nom pour le dossier de transfert et téléchargez vos fichiers.
                    </Text>
                    <Input
                        placeholder="Nom du dossier de transfert"
                        value={customFolderName}
                        onChange={(e) => setCustomFolderName(e.target.value)}
                        style={{
                            marginTop: '10px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            padding: '8px 12px',
                            fontSize: '14px',
                        }}
                    />
                    <div style={{ marginTop: '20px' }}>
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            disabled={successfulUploads < 2 || !customFolderName.trim()} // Désactiver si moins de 2 fichiers ou nom vide
                            size="large"
                            onClick={handleTransferWithCustomName}
                            style={{
                                width: '100%',
                                height: '56px',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: 500,
                                backgroundColor: (successfulUploads < 2 || !customFolderName.trim()) ? '#d1d5db' : '#0052cc', // Gris si désactivé, bleu si activé
                                border: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: (successfulUploads >= 2 && customFolderName.trim()) ? '0 4px 14px rgba(0,82,204,0.3)' : 'none', // Ombre si activé
                            }}
                        >
                            Transférer les fichiers
                        </Button>
                    </div>
                </Space>
            ) : (
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <FolderAddOutlined style={{ fontSize: '32px', color: '#0052cc' }} />
                    <Text style={{ color: '#6b7280' }}>Aucun dossier personnel trouvé</Text>
                    <Button
                        type="primary"
                        onClick={createUserFolder}
                        loading={loading}
                        icon={<FolderAddOutlined />}
                        style={{ backgroundColor: '#0052cc', border: 'none', borderRadius: '8px' }}
                    >
                        Créer Mon Dossier
                    </Button>
                </Space>
            )}
        </Card>
    );
};

export default UserFolderSection;