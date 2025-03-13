import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Alert } from 'antd';
import { CalculatorOutlined, FileOutlined } from '@ant-design/icons';
import FileUpload from './FileUpload';
import CalculSurface from './CalculSurface';
import axios from 'axios';

const { Title, Text } = Typography;

const CalculTA = () => {
    const [folderStructure, setFolderStructure] = useState({ folders: [], files: [] });
    const [loadingFolder, setLoadingFolder] = useState(false);
    const [folderError, setFolderError] = useState(null);
    const [extractedData, setExtractedData] = useState(null);

    const fetchFolderFiles = async () => {
        if (!localStorage.getItem('token')) {
            setFolderError('Veuillez vous connecter pour accéder à votre dossier');
            return;
        }

        setLoadingFolder(true);
        try {
            const response = await axios.get('/api/user-folder/files', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            setFolderStructure(response.data || { folders: [], files: [] });
            console.log('Folder structure:', response.data);
            setFolderError(null);
        } catch (error) {
            setFolderError(error.response?.data?.error || 'Erreur lors du chargement des fichiers du dossier');
        } finally {
            setLoadingFolder(false);
        }
    };

    useEffect(() => {
        fetchFolderFiles();
    }, []);

    return (
        <div
            style={{
                height: 'calc(100vh - 64px)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fafafa',
                padding: '24px',
                overflowY: 'auto',
                boxSizing: 'border-box',
            }}
        >
            {/* Header Section */}
            <div
                style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    marginBottom: '24px',
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                <Title
                    level={3}
                    style={{
                        margin: 0,
                        color: '#0052cc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontWeight: 600,
                    }}
                >
                    <CalculatorOutlined /> Surface Calculator
                </Title>
                <Text
                    style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', display: 'block' }}
                >
                    Calculez automatiquement la surface à partir de fichiers .dxf
                </Text>
            </div>

            {/* Alert */}
            <Alert
                message={<Text strong>Format supporté : .dxf uniquement</Text>}
                description="Pour des calculs précis, seuls les fichiers .dxf sont acceptés."
                type="info"
                showIcon
                style={{
                    marginBottom: '24px',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#dbeafe',
                    border: 'none',
                    borderLeft: '4px solid #3b82f6',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
            />

            {/* Main Content */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Row
                    gutter={[16, 16]}
                    style={{
                        flex: '1 0 auto',
                        alignItems: 'flex-start',
                        width: '100%',
                    }}
                >
                    {/* Fichiers du dossier personnel */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text strong style={{ color: '#000000d9' }}>Importation de fichier .dxf</Text>
                                </Space>
                            }
                            bordered={false}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                            }}
                            bodyStyle={{ padding: '20px', overflow: 'auto' }}
                            hoverable
                        >
                            <FileUpload
                                folderStructure={folderStructure}
                                loading={loadingFolder}
                                error={folderError}
                                type="folder"
                                setExtractedData={setExtractedData}
                                extractedData={extractedData}
                            />
                        </Card>
                    </Col>

                    {/* Importation de projet .dxf (Copied from Fichiers du dossier personnel) */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <FileOutlined style={{ color: '#0052cc' }} />
                                    <Text strong style={{ color: '#000000d9' }}>Importation de projet .dxf</Text>
                                </Space>
                            }
                            bordered={false}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                width: '100%',
                            }}
                            bodyStyle={{ padding: '20px', overflow: 'auto' }}
                            hoverable
                        >
                            <FileUpload
                                folderStructure={folderStructure}
                                loading={loadingFolder}
                                error={folderError}
                                type="folder" // Changed from "upload" to "folder" to match Fichiers du dossier personnel
                                setExtractedData={setExtractedData}
                                extractedData={extractedData}
                            />
                        </Card>
                    </Col>

                    {/* CalculSurface Section */}
                    <Col xs={24} md={12} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <CalculatorOutlined style={{ color: '#0052cc' }} />
                                    <Text strong style={{ color: '#000000d9' }}>Calcul Surface</Text>
                                </Space>
                            }
                            bordered={false}
                            style={{
                                borderRadius: '8px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                backgroundColor: '#f9fafb',
                                width: '100%',
                            }}
                            bodyStyle={{ padding: '20px', overflow: 'auto' }}
                            hoverable
                        >
                            <CalculSurface extractedData={extractedData} />
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Custom CSS */}
            <style jsx global>{`
                .ant-card-hoverable:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 14px rgba(0,0,0,0.1) !important;
                    border: 1px solid #e5e7eb;
                }
                .ant-card-head {
                    padding: 0 20px;
                    min-height: 56px;
                    borderBottom: '1px solid #e5e7eb';
                }
                .ant-card-head-title {
                    font-weight: 600;
                    padding: 16px 0;
                }
                .ant-btn-primary:not(:disabled):hover {
                    background-color: #003eb3 !important;
                    transform: scale(1.05);
                }
                .ant-btn-primary:disabled {
                    cursor: not-allowed;
                    opacity: 0.8;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0,82,204,0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(0,82,204,0); }
                    100% { box-shadow: 0 0 0 0 rgba(0,82,204,0); }
                }
            `}</style>
        </div>
    );
};

export default CalculTA;