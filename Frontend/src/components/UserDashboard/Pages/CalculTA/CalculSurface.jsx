import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Button, Alert } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import { InputText } from 'primereact/inputtext';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

const { Text } = Typography;

const CalculSurface = ({ extractedData }) => {
    const [threshold, setThreshold] = useState('');
    const [floorName, setFloorName] = useState('');
    const [surfaceArea, setSurfaceArea] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setSurfaceArea(null);
        setError(null);
    }, [extractedData]);

    const calculateSurfaceArea = () => {
        if (!extractedData || (!extractedData.polylines && !extractedData.circles)) {
            setError('Aucune donnée extraite disponible pour le calcul.');
            setSurfaceArea(null);
            return;
        }

        try {
            let totalArea = 0;

            if (extractedData.polylines && extractedData.polylines.length > 0) {
                extractedData.polylines.forEach(polyline => {
                    if (polyline.vertices && polyline.vertices.length > 2) {
                        let area = 0;
                        const coords = polyline.vertices;
                        for (let i = 0; i < coords.length - 1; i++) {
                            area += coords[i].x * coords[i + 1].y - coords[i + 1].x * coords[i].y;
                        }
                        area = Math.abs(area) / 2;
                        totalArea += area;
                    }
                });
            }

            if (extractedData.circles && extractedData.circles.length > 0) {
                extractedData.circles.forEach(circle => {
                    if (circle.radius) {
                        const circleArea = Math.PI * Math.pow(circle.radius, 2);
                        totalArea += circleArea;
                    }
                });
            }

            const thresholdValue = parseFloat(threshold);
            if (!isNaN(thresholdValue) && totalArea < thresholdValue) {
                setError(`Surface (${totalArea.toFixed(2)} m²) inférieure au seuil (${thresholdValue} m²).`);
                setSurfaceArea(null);
            } else {
                setSurfaceArea(totalArea);
                setError(null);
                console.log('Threshold:', threshold, 'Floor Name:', floorName, 'Surface Area:', totalArea);
            }
        } catch (err) {
            setError('Erreur lors du calcul de la surface.');
            setSurfaceArea(null);
            console.error('Calculation error:', err);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Space direction="vertical" size={16} style={{ width: '100%', flex: 1 }}>
                <Space align="center">
                    <CalculatorOutlined style={{ color: '#1a73e8', fontSize: '18px' }} />
                    <Text strong style={{ fontSize: '16px', color: '#1a73e8' }}>Calcul Surface</Text>
                </Space>

                <div>
                    <Text strong style={{ fontSize: '14px' }}>Seuil (m²)</Text>
                    <InputText
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="Valeur minimale (m²)"
                        style={{ width: '100%', marginTop: '6px', fontSize: '13px', padding: '4px 8px' }}
                        className="p-inputtext-sm"
                    />
                </div>

                <div>
                    <Text strong style={{ fontSize: '14px' }}>Nom d'étage</Text>
                    <InputText
                        value={floorName}
                        onChange={(e) => setFloorName(e.target.value)}
                        placeholder="Nom de l'étage"
                        style={{ width: '100%', marginTop: '6px', fontSize: '13px', padding: '4px 8px' }}
                        className="p-inputtext-sm"
                    />
                </div>

                <Button
                    type="primary"
                    onClick={calculateSurfaceArea}
                    style={{ width: '100%', borderRadius: '4px', padding: '4px 16px' }}
                    icon={<CalculatorOutlined />}
                    disabled={!extractedData}
                >
                    Calculer
                </Button>

                {surfaceArea !== null && (
                    <Alert
                        message={`Surface pour ${floorName || 'l’étage'}`}
                        description={`${surfaceArea.toFixed(2)} m²`}
                        type="success"
                        showIcon
                        style={{ marginTop: '12px', borderRadius: '4px', fontSize: '13px' }}
                    />
                )}

                {error && (
                    <Alert
                        message="Erreur"
                        description={error}
                        type="error"
                        showIcon
                        style={{ marginTop: '12px', borderRadius: '4px', fontSize: '13px' }}
                    />
                )}
            </Space>
        </div>
    );
};

export default CalculSurface;