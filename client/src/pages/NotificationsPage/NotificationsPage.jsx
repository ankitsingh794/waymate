/**
 * Notifications Page
 * Displays user notifications with modern design
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import { VscBell, VscCheck, VscClose, VscArrowRight } from 'react-icons/vsc';
import { Card, CardBody, Button, Badge, Alert } from '../../components/UI';
import DashboardNavbar from '../../components/DashboardNavbar';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/notifications');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/v1/notifications/mark-all-read');
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read: true,
        }))
      );
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'trip_invite':
      case 'trip_update':
        return '✈️';
      case 'message':
        return '💬';
      case 'payment':
        return '💳';
      default:
        return '📢';
    }
  };

  const getNotificationBadgeVariant = (type) => {
    switch (type) {
      case 'trip_invite':
      case 'trip_update':
        return 'info';
      case 'payment':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  return (
    <div className="notifications-page">
      <DashboardNavbar />

      <div className="notifications-body">
        <div className="notifications-header">
          <div>
            <h1>Notifications</h1>
            <p>Stay updated with your travel activities</p>
          </div>
          {notifications.some(n => !n.read) && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {error && <Alert variant="error" closable>{error}</Alert>}

        <div className="notifications-container">
          {loading ? (
            <div className="notifications-empty">
              <VscBell className="empty-icon" />
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <VscBell className="empty-icon" />
              <h3>No notifications yet</h3>
              <p>You'll see notifications about your trips and messages here</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map(notification => (
                <Card
                  key={notification._id}
                  className={`notification-card ${!notification.read ? 'unread' : ''}`}
                  padding="md"
                  elevated={!notification.read}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-text">
                      <h4 className="notification-title">{notification.title}</h4>
                      <p className="notification-message">{notification.message}</p>
                      <div className="notification-footer">
                        <Badge variant={getNotificationBadgeVariant(notification.type)} size="sm">
                          {notification.type.replace('_', ' ')}
                        </Badge>
                        <span className="notification-time">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {notification.actionUrl && (
                      <Button variant="ghost" size="sm" icon={VscArrowRight} iconPosition="right">
                        View
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
