import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/toastContext';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function Notifications() {
  usePageTitle('Notificaciones');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetch('/notificaciones');
      setNotifications(data.data || []);
    } catch (err) {
      setError('No se pudieron cargar las notificaciones: ' + err.message);
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const columns = [
    { key: 'destinatario', label: 'Destinatario', render: n => n.email_destino },
    { key: 'tipo', label: 'Tipo', render: n => <Badge value={n.tipo_notificacion} /> },
    { key: 'asunto', label: 'Asunto', render: n => n.asunto },
    {
      key: 'mensaje', label: 'Mensaje',
      render: n => {
        const text = n.mensaje || '';
        return text.length > 80 ? text.slice(0, 80) + '…' : text;
      },
    },
    { key: 'estado', label: 'Estado', render: n => <Badge value={n.estado} /> },
    { key: 'fecha', label: 'Fecha', render: n => formatDate(n.fecha_envio || n.fecha_creacion) },
    { key: 'intentos', label: 'Intentos', render: n => n.intentos_envio || 0 },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Notificaciones</h1><p className="page-subtitle">Cola auditable generada al crear asignaciones.</p></div>
      </div>

      {error && <div className="alert" role="alert"><Icon name="warning" size={18} />{error}</div>}

      {loading ? (
        <>
          <span className="visually-hidden" role="status">Cargando notificaciones…</span>
          <Skeleton variant="table" rows={5} />
        </>
      ) : (
        <Table
          caption="Historial de notificaciones"
          columns={columns}
          rows={notifications}
          keyFn={n => n.id}
          empty={
            <EmptyState
              icon="mail"
              title="Sin notificaciones"
              description="Las notificaciones pendientes y enviadas aparecerán aquí."
            />
          }
        />
      )}
    </div>
  );
}
