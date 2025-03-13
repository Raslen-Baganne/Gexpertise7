import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Spin, Tree, Tooltip, Empty, Button, message } from 'antd'; // Added Col and message to imports
import { FileOutlined, FolderOutlined, ClockCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const Ressources = () => {
    const [folderStructure, setFolderStructure] = useState({ folders: [], files: [] });
    const [loadingFolder, setLoadingFolder] = useState(false);
    const [folderError, setFolderError] = useState(null);

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

    const handleDownload = async (filename, folderPath = "") => {
        try {
            const response = await axios.post('/api/user-folder/download-file', 
                { filename, folder: folderPath },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'blob', // Important for file download
                }
            );

            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success(`Fichier ${filename} téléchargé avec succès !`); // Added success message
        } catch (error) {
            console.error('Download error:', error.response?.data || error.message);
            message.error('Erreur lors du téléchargement du fichier.');
        }
    };

    // Build Tree Data for Folder Structure
    const buildTreeData = (structure, parentPath = "") => {
        const { folders, files } = structure;
        const treeData = [];

        folders.forEach(folder => {
            treeData.push({
                title: (
                    <Space>
                        <FolderOutlined style={{ color: '#faad14', fontSize: '16px' }} />
                        <Text strong>{folder.name}</Text>
                    </Space>
                ),
                key: folder.path,
                children: buildTreeData(folder.sub_structure, folder.path),
            });
        });

        files.forEach(file => {
            treeData.push({
                title: (
                    <Tooltip
                        title={
                            <Space direction="vertical" size={4}>
                                <Text>Taille: {(file.size / 1024 / 1024).toFixed(2)} MB</Text>
                                {file.last_modified && (
                                    <Text>Dernière modification: {new Date(file.last_modified).toLocaleString()}</Text>
                                )}
                            </Space>
                        }
                    >
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                                <FileOutlined style={{ color: '#1a73e8', fontSize: '16px' }} />
                                <Text>{file.name}</Text>
                            </Space>
                            <Button
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(file.name, parentPath)}
                                style={{ color: '#0052cc' }}
                            >
                                Télécharger
                            </Button>
                        </Space>
                    </Tooltip>
                ),
                key: `${parentPath}/${file.name}`,
                isLeaf: true,
            });
        });

        return treeData;
    };

    const treeData = buildTreeData(folderStructure);

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
                    <FileOutlined /> Ressources
                </Title>
                <Text
                    style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', display: 'block' }}
                >
                    Consultez et téléchargez vos projets existants
                </Text>
            </div>

            {/* Main Content */}
            <Row style={{ flex: '1 0 auto', width: '100%' }}>
                <Col span={24}>
                    <Card
                        title={
                            <Space>
                                <FolderOutlined style={{ color: '#0052cc', fontSize: '18px' }} />
                                <Text strong style={{ color: '#000000d9', fontSize: '16px' }}>Projet Existant</Text>
                            </Space>
                        }
                        bordered={false}
                        style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            backgroundColor: '#fff',
                            width: '100%',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: '20px', overflowY: 'auto', height: 'calc(100% - 56px)' }}
                        headStyle={{ borderBottom: '1px solid #e5e7eb', padding: '16px 20px' }}
                        hoverable
                    >
                        {loadingFolder ? (
                            <Spin tip="Chargement des fichiers..." size="large" style={{ display: 'block', textAlign: 'center', padding: '20px' }} />
                        ) : folderError ? (
                            <Text type="danger" style={{ fontSize: '14px', textAlign: 'center', display: 'block', padding: '20px' }}>{folderError}</Text>
                        ) : treeData.length > 0 ? (
                            <Tree
                                treeData={treeData}
                                showLine
                                blockNode
                                defaultExpandAll
                                style={{ background: '#fff', borderRadius: '4px', padding: '8px' }}
                            />
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={<Text type="secondary">Aucun dossier ou fichier .dxf trouvé</Text>}
                                style={{ padding: '20px' }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Custom CSS */}
            <style jsx global>{`
                .ant-card-hoverable:hover {
                    transform: scale(1.01);
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
                .ant-tree-node-content-wrapper {
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background-color 0.2s ease;
                }
                .ant-tree-node-content-wrapper:hover {
                    background-color: #f5f7fa;
                }
                .ant-btn-link {
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
};

export default Ressources;