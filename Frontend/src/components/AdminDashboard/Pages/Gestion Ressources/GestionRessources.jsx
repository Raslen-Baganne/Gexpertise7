import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { 
  Button, 
  Card, 
  Space, 
  Typography, 
  message, 
  Spin, 
  Modal, 
  Form, 
  Input, 
  DatePicker,
  ConfigProvider,
} from 'antd';
import { 
    FolderOutlined, 
    DeleteOutlined, 
    ReloadOutlined,  
    EditOutlined, 
    ExclamationCircleOutlined 
  } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './GestionRessources.css';

const { Title, Text } = Typography;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;

const GestionRessources = () => {
  const [usersWithFolders, setUsersWithFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const fetchUsersWithFolders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Veuillez vous connecter d\'abord.');
        return;
      }

      console.log('Fetching users with folders...');
      const response = await axios.get('/api/users/users-with-folders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Fetch response:', response.data);
      const formattedData = response.data.map(item => ({
        userId: item.user_id,
        fullName: `${item.nom} ${item.prenom}`,
        email: item.email,
        folderId: item.folder_id,
        folderName: item.nom_dossier || 'Aucun dossier',
        creationDate: item.date_creation
          ? moment(item.date_creation).format('DD/MM/YYYY HH:mm:ss')
          : 'N/A',
      }));

      setUsersWithFolders(formattedData);
    } catch (error) {
      console.error('Erreur lors de fetchUsersWithFolders:', error);
      message.error('Erreur lors du chargement des données: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const showEditModal = (rowData) => {
    console.log(`Affichage de la fenêtre d'édition pour l'utilisateur ID ${rowData.userId}`);
    setEditingUser(rowData);
    form.setFieldsValue({
      fullName: rowData.fullName,
      email: rowData.email,
      folderName: rowData.folderName === 'Aucun dossier' ? '' : rowData.folderName,
      creationDate: rowData.creationDate !== 'N/A' ? moment(rowData.creationDate, 'DD/MM/YYYY HH:mm:ss') : null,
    });
    setIsEditModalVisible(true);
  };

  const handleEdit = async (values) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { fullName, email, folderName } = values;
      const [nom, prenom] = fullName.split(' ');

      await axios.put(`/api/users/${editingUser.userId}`, {
        nom,
        prenom,
        email,
        folderName: folderName || null,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      message.success('Utilisateur et dossier mis à jour avec succès');
      setIsEditModalVisible(false);
      fetchUsersWithFolders();
    } catch (error) {
      console.error('Erreur lors de handleEdit:', error);
      message.error('Erreur lors de la mise à jour: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <Space size="small">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => showEditModal(rowData)}
          className="action-button edit-button"
        >
          Modifier
        </Button>
      </Space>
    );
  };

  const folderNameTemplate = (rowData) => {
    return (
      <Space>
        {rowData.folderName === 'Aucun dossier' ? (
          <Text type="secondary" italic>
            Aucun dossier
          </Text>
        ) : (
          <>
            <FolderOutlined className="folder-icon" />
            <Text>{rowData.folderName}</Text>
          </>
        )}
      </Space>
    );
  };

  useEffect(() => {
    fetchUsersWithFolders();
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: '#ffffff',
          colorText: '#1f2a44',
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif",
        },
      }}
    >
      <div className="gestion-ressources-container">
        <Card
          title={
            <Title level={3} className="card-title">
              Gestion des Ressources (Utilisateurs)
            </Title>
          }
          extra={
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={fetchUsersWithFolders}
              loading={loading}
              className="refresh-button"
            >
              Rafraîchir
            </Button>
          }
          className="gestion-card"
        >
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text className="loading-text">Chargement des données...</Text>
            </div>
          ) : (
            <DataTable
              value={usersWithFolders}
              selection={selectedRows}
              onSelectionChange={(e) => setSelectedRows(e.value)}
              paginator
              rows={5}
              rowsPerPageOptions={[5, 10, 25]}
              dataKey="userId"
              responsiveLayout="scroll"
              emptyMessage="Aucune donnée trouvée"
              className="custom-datatable"
              header={<Text strong className="table-header">Liste des utilisateurs et dossiers</Text>}
            >
              <Column
                selectionMode="multiple"
                headerStyle={{ width: '3rem' }}
                exportable={false}
              />
              <Column
                field="userId"
                header="ID Utilisateur"
                sortable
                style={{ minWidth: '120px', padding: '12px' }}
                className="table-column"
              />
              <Column
                field="fullName"
                header="Nom Complet"
                sortable
                style={{ minWidth: '200px', padding: '12px' }}
                className="table-column"
              />
              <Column
                field="email"
                header="Email"
                sortable
                style={{ minWidth: '250px', padding: '12px' }}
                className="table-column"
              />
              <Column
                field="folderName"
                header="Nom du Dossier"
                body={folderNameTemplate}
                sortable
                style={{ minWidth: '200px', padding: '12px' }}
                className="table-column"
              />
              <Column
                field="creationDate"
                header="Date de Création"
                sortable
                style={{ minWidth: '180px', padding: '12px' }}
                className="table-column"
              />
              <Column
                body={actionBodyTemplate}
                header="Actions"
                style={{ minWidth: '200px', padding: '12px' }}
                className="table-column"
              />
            </DataTable>
          )}
        </Card>

        <Modal
          title="Modifier les Informations"
          visible={isEditModalVisible}
          onOk={() => form.submit()}
          onCancel={() => setIsEditModalVisible(false)}
          okText="Enregistrer"
          cancelText="Annuler"
          confirmLoading={loading}
          className="edit-modal"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleEdit}
            initialValues={editingUser}
            className="edit-form"
          >
            <Form.Item
              name="fullName"
              label="Nom Complet"
              rules={[{ required: true, message: 'Veuillez entrer le nom complet!' }]}
            >
              <Input placeholder="Ex: Jean Dupont" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Veuillez entrer un email valide!' }]}
            >
              <Input placeholder="Ex: jean.dupont@example.com" />
            </Form.Item>
            <Form.Item
              name="folderName"
              label="Nom du Dossier"
            >
              <Input placeholder="Ex: dossier_projet" />
            </Form.Item>
            <Form.Item
              name="creationDate"
              label="Date de Création"
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: '100%' }} disabled />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default GestionRessources;
