import React, { useState } from 'react';
import { Upload, message, Button, Progress, Space, Tree, Table, Card, List, Spin, Typography, Modal, Tabs, Tooltip, Empty } from 'antd';
import { InboxOutlined, FileOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, FolderOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { motion } from 'framer-motion'; // For animations

const { Dragger } = Upload;
const { Text, Paragraph, Title } = Typography;
const { TabPane } = Tabs;

const FileUpload = ({ folderStructure, loading, error, type, setExtractedData, extractedData }) => {
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [loadingStates, setLoadingStates] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleUpload = async (file = null) => {
        const formData = new FormData();
        if (file) formData.append('file', file);
        else fileList.forEach(f => formData.append('file', f));

        setUploading(true);
        setCurrentProgress(0);

        try {
            const uploadResponse = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setCurrentProgress(progress);
                },
            });

            message.success('Fichier .dxf téléchargé avec succès !');

            setLoadingStates(prev => ({ ...prev, [file?.name || 'upload']: true }));
            const extractResponse = await axios.post('/api/extract-data', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                withCredentials: true,
            });
            setExtractedData(extractResponse.data);
            setIsModalVisible(true);
        } catch (error) {
            console.error('Erreur lors du téléchargement ou de l\'extraction:', error.response?.data || error.message);
            message.error('Erreur : ' + (error.response?.data?.error || 'Veuillez réessayer.'));
        } finally {
            setUploading(false);
            setLoadingStates(prev => ({ ...prev, [file?.name || 'upload']: false }));
        }
    };

    const handleExtractFromFolder = async (filename, folderPath = "") => {
        setLoadingStates(prev => ({ ...prev, [`${folderPath}/${filename}`]: true }));
        setExtractedData(null);
        setCurrentProgress(0);

        try {
            const extractResponse = await axios.post('/api/user-folder/extract-data-from-file', 
                { filename, folder: folderPath },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setCurrentProgress(progress);
                    }
                }
            );
            setExtractedData(extractResponse.data);
            message.success({
                content: `Données extraites avec succès pour ${filename} !`,
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            });
            setIsModalVisible(true);
        } catch (error) {
            console.error('Extraction error:', error.response?.data || error.message);
            message.error('Erreur : ' + (error.response?.data?.error || 'Veuillez réessayer.'));
            setErrorMessage(error.response?.data?.error || 'Erreur lors de l’extraction.');
            setExtractedData(null);
        } finally {
            setLoadingStates(prev => ({ ...prev, [`${folderPath}/${filename}`]: false }));
        }
    };

    const resetUploadState = () => {
        setFileList([]);
        setUploading(false);
        setCurrentProgress(0);
        setLoadingStates({});
        setErrorMessage(null);
        setIsModalVisible(false);
        if (type === 'upload') message.info('Fichier supprimé. Prêt pour un nouveau téléchargement.');
        setExtractedData(null);
    };

    const uploadProps = {
        onRemove: () => resetUploadState(),
        beforeUpload: file => {
            const isDXF = file.name.toLowerCase().endsWith('.dxf');
            if (!isDXF) {
                setErrorMessage('Seuls les fichiers .dxf sont acceptés !');
                return false;
            }
            const isLt50M = file.size / 1024 / 1024 < 50;
            if (!isLt50M) {
                setErrorMessage('Le fichier doit faire moins de 50MB !');
                return false;
            }
            if (fileList.length >= 1) {
                setErrorMessage('Vous ne pouvez télécharger qu\'un seul fichier à la fois');
                return false;
            }
            setFileList([file]);
            setErrorMessage(null);
            setCurrentProgress(0);
            setExtractedData(null);
            return false;
        },
        fileList,
        maxCount: 1,
        multiple: false,
    };

    // Build Tree Data for Folder Structure
    const buildTreeData = (structure, parentPath = "") => {
        const { folders, files } = structure;
        const treeData = [];

        folders.forEach(folder => {
            treeData.push({
                title: (
                    <Space>
                        <FolderOutlined style={{ color: '#faad14' }} />
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
                                <FileOutlined style={{ color: '#1a73e8' }} />
                                <Text>{file.name}</Text>
                            </Space>
                            <Button
                                type="link"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleExtractFromFolder(file.name, parentPath)}
                                loading={loadingStates[`${parentPath}/${file.name}`]}
                                style={{ color: '#0052cc' }}
                            >
                                Extraire
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

    // Entity Table Columns
    const entityColumns = [
        { title: 'Type', dataIndex: 'type', key: 'type', sorter: (a, b) => a.type.localeCompare(b.type), width: 120 },
        { title: 'Calque', dataIndex: 'layer', key: 'layer', sorter: (a, b) => a.layer.localeCompare(b.layer), width: 150 },
        { 
            title: 'Détails', 
            dataIndex: 'details', 
            key: 'details', 
            render: text => <Text ellipsis={{ tooltip: text }}>{text}</Text>,
            width: 200,
        },
    ];

    const renderEntityDataSource = (entities) => entities.map((entity, index) => ({
        key: `${index}`,
        type: entity.type || 'N/A',
        layer: entity.layer || 'N/A',
        details: JSON.stringify(entity),
    }));

    return (
        <div style={{ textAlign: 'left' }}>
            {type === 'folder' ? (
                loading ? (
                    <Spin tip="Chargement des fichiers..." size="large" style={{ display: 'block', textAlign: 'center', padding: '20px' }} />
                ) : error ? (
                    <Paragraph type="danger" style={{ fontSize: '14px', textAlign: 'center', padding: '20px' }}>{error}</Paragraph>
                ) : treeData.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Tree
                            treeData={treeData}
                            showLine
                            blockNode
                            style={{ background: '#fff', borderRadius: '8px', padding: '8px' }}
                        />
                    </motion.div>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<Text type="secondary">Aucun dossier ou fichier .dxf trouvé</Text>}
                        style={{ padding: '20px' }}
                    />
                )
            ) : (
                <>
                    <Dragger {...uploadProps} style={{
                        padding: '16px',
                        background: fileList.length === 0 ? '#fafafa' : '#f0f5ff',
                        border: '2px dashed #1a73e8',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                    }}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: '#1a73e8', fontSize: '40px', opacity: fileList.length === 0 ? 1 : 0.5 }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: '14px', fontWeight: 500, color: fileList.length === 0 ? '#000000d9' : '#1a73e8' }}>
                            {fileList.length === 0 ? 'Glissez votre fichier .dxf ici' : 'Fichier prêt à être téléchargé'}
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: '12px', color: '#666' }}>
                            Formats acceptés : .dxf (Max: 50MB)
                        </p>
                    </Dragger>

                    {errorMessage && (
                        <Paragraph type="danger" style={{ marginTop: '12px', textAlign: 'center', fontSize: '14px' }}>{errorMessage}</Paragraph>
                    )}

                    {fileList.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <List
                                size="small"
                                dataSource={fileList}
                                renderItem={file => (
                                    <List.Item
                                        style={{ padding: '8px', background: '#f0f5ff', borderRadius: '4px', border: '1px solid #e8e8e8' }}
                                        actions={[
                                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => uploadProps.onRemove(file)} size="small" />,
                                        ]}
                                    >
                                        <Space>
                                            <FileOutlined style={{ color: '#1a73e8', fontSize: '16px' }} />
                                            <Text strong style={{ fontSize: '14px' }}>{file.name}</Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </div>
                    )}

                    {currentProgress > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <Progress percent={currentProgress} strokeColor="#1a73e8" trailColor="#f0f0f0" size="small" />
                        </div>
                    )}

                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <Button
                            type="primary"
                            onClick={handleUpload}
                            disabled={fileList.length === 0}
                            loading={uploading || loadingStates['upload']}
                            icon={<CheckCircleOutlined />}
                            size="middle"
                            style={{ borderRadius: '4px', padding: '4px 16px' }}
                        >
                            {uploading ? 'Téléchargement...' : loadingStates['upload'] ? 'Extraction...' : 'Extraire les données'}
                        </Button>
                    </div>
                </>
            )}

            <Modal
                title={<Title level={4} style={{ margin: 0, color: '#0052cc' }}>Données extraites du fichier .dxf</Title>}
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalVisible(false)} style={{ borderRadius: '4px' }}>
                        Fermer
                    </Button>,
                ]}
                width={900}
                bodyStyle={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}
                style={{ top: 20 }}
            >
                {extractedData && !extractedData.error ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Tabs defaultActiveKey="stats" type="card" style={{ marginTop: '16px' }}>
                            <TabPane tab="Statistiques" key="stats">
                                <Card bordered={false} style={{ background: '#f9fafb', borderRadius: '8px' }}>
                                    <Space direction="vertical" size={8}>
                                        <Text strong>Statistiques générales :</Text>
                                        <List
                                            size="small"
                                            dataSource={[
                                                { label: 'Calques', value: extractedData.statistics.layer_count },
                                                { label: 'Polylignes', value: extractedData.statistics.polyline_count },
                                                { label: 'Lignes', value: extractedData.statistics.line_count },
                                                { label: 'Cercles', value: extractedData.statistics.circle_count },
                                                { label: 'Arcs', value: extractedData.statistics.arc_count },
                                                { label: 'Textes', value: extractedData.statistics.text_count },
                                                { label: 'Total d’entités', value: extractedData.statistics.total_entities },
                                            ]}
                                            renderItem={item => (
                                                <List.Item style={{ padding: '4px 0' }}>
                                                    <Text>{item.label}: <Text strong>{item.value}</Text></Text>
                                                </List.Item>
                                            )}
                                        />
                                    </Space>
                                </Card>
                            </TabPane>
                            <TabPane tab="Calques" key="layers">
                                <Table
                                    dataSource={extractedData.layers.map((layer, idx) => ({
                                        key: idx,
                                        name: layer.name,
                                        color: layer.color || 'N/A',
                                    }))}
                                    columns={[
                                        { title: 'Nom', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
                                        { title: 'Couleur', dataIndex: 'color' },
                                    ]}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                />
                            </TabPane>
                            <TabPane tab="Polylignes" key="polylines">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.polylines || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Lignes" key="lines">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.lines || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Cercles" key="circles">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.circles || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Arcs" key="arcs">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.arcs || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                            <TabPane tab="Textes" key="texts">
                                <Table
                                    dataSource={renderEntityDataSource(extractedData.texts || [])}
                                    columns={entityColumns}
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                />
                            </TabPane>
                        </Tabs>
                    </motion.div>
                ) : (
                    <Empty description={<Text>Aucune donnée disponible</Text>} />
                )}
            </Modal>
        </div>
    );
};

export default FileUpload;