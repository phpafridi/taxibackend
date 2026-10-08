"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import { ListGroup, Offcanvas, Button, Badge, Spinner } from "react-bootstrap";
import { IconBell, IconCircleCheck, IconExternalLink } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import "simplebar-react/dist/simplebar.min.css";

interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

const NotificationList: React.FC<NotificationProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notification/admin');
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id?: number) => {
    try {
      setMarkingRead(true);
      
      const response = await fetch('/api/notification/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: id ? [id] : notifications.filter(n => !n.isRead).map(n => n.id),
          markAll: !id,
        }),
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      // Update local state
      if (id) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
      
    } catch (error) {
      console.error('Error marking as read:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // First mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Then navigate if there's an actionUrl
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
    // If no actionUrl, just close the panel
    // Don't close automatically if there's no actionUrl
  };

  const handleViewButtonClick = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation(); // Prevent triggering the parent click
    
    // First mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Then navigate if there's an actionUrl
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE_REQUEST':
        return "🔧";
      case 'AGREEMENT_EXPIRING':
        return "📅";
      case 'INSURANCE_EXPIRY':
        return "🛡️";
      case 'WEEKLY_PAYMENT_DUE':
      case 'WEEKLY_PAYMENT_MISSED':
      case 'WEEKLY_PAYMENT_PAID':
        return "💰";
      case 'LEDGER_UPDATE':
        return "📊";
      case 'SYSTEM':
        return "⚙️";
      default:
        return "🔔";
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'MAINTENANCE_REQUEST':
        return 'Maintenance';
      case 'AGREEMENT_EXPIRING':
        return 'Agreement';
      case 'INSURANCE_EXPIRY':
        return 'Insurance';
      case 'WEEKLY_PAYMENT_DUE':
      case 'WEEKLY_PAYMENT_MISSED':
      case 'WEEKLY_PAYMENT_PAID':
        return 'Payment';
      case 'LEDGER_UPDATE':
        return 'Ledger';
      case 'SYSTEM':
        return 'System';
      default:
        return 'General';
    }
  };

  return (
    <Offcanvas 
      placement="end" 
      show={isOpen} 
      onHide={onClose}
      className="notification-offcanvas"
      style={{ height: "100vh" }}
    >
      <div className="d-flex flex-column h-100">
        <div className="sticky-top bg-white border-bottom">
          <Offcanvas.Header closeButton>
            <div className="d-flex justify-content-between w-100 align-items-center">
              <h5 className="mb-0 d-flex align-items-center">
                <IconBell size={20} className="me-2" />
                Notifications
                {unreadCount > 0 && (
                  <Badge bg="danger" className="ms-2">
                    {unreadCount}
                  </Badge>
                )}
              </h5>
              <div className="d-flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => markAsRead()}
                    disabled={markingRead}
                    className="d-flex align-items-center"
                  >
                    {markingRead ? (
                      <Spinner size="sm" animation="border" variant="success" />
                    ) : (
                      <>
                        <IconCircleCheck size={16} className="me-1" />
                        <span className="d-none d-md-inline">Mark All</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Offcanvas.Header>
        </div>

        <div className="flex-grow-1 overflow-hidden">
          <SimpleBar style={{ height: "100%" }}>
            <ListGroup variant="flush">
              {loading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="text-muted mt-2">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center p-5">
                  <IconBell size={48} className="text-muted mb-3" />
                  <p className="text-muted">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <ListGroup.Item
                    key={notification.id}
                    action
                    className={`p-3 border-bottom ${!notification.isRead ? 'bg-light' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="d-flex gap-3 flex-grow-1">
                        <div className="position-relative flex-shrink-0">
                          <div className="icon-shape icon-md bg-light rounded-circle d-flex align-items-center justify-content-center">
                            <span className="fs-4">{getNotificationIcon(notification.type)}</span>
                          </div>
                          {!notification.isRead && (
                            <div className="position-absolute top-0 start-100 translate-middle">
                              <Badge bg="primary" pill className="p-1" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <h6 className="mb-0 text-break">{notification.title}</h6>
                            <Badge bg="secondary" className="fs-9 flex-shrink-0">
                              {getNotificationTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          <p className="mb-2 text-muted small">{notification.message}</p>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </small>
                            
                            {notification.actionUrl && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="d-flex align-items-center ms-2"
                                onClick={(e) => handleViewButtonClick(e, notification)}
                                title="View Details"
                              >
                                <IconExternalLink size={16} className="me-1" />
                                <span className="d-none d-sm-inline">View</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </SimpleBar>
        </div>
      </div>
      
      <style jsx global>{`
        /* Responsive styles for mobile and desktop */
        .notification-offcanvas {
          width: 100% !important;
          max-width: 450px !important;
        }
        
        @media (max-width: 576px) {
          .notification-offcanvas {
            width: 100vw !important;
            max-width: 100vw !important;
          }
          
          .notification-offcanvas .offcanvas-header {
            padding: 1rem;
          }
          
          .notification-offcanvas .offcanvas-body {
            padding: 0;
          }
          
          .notification-offcanvas .list-group-item {
            padding: 1rem !important;
          }
          
          .notification-offcanvas .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }
        }
        
        @media (min-width: 577px) {
          .notification-offcanvas {
            width: 450px !important;
          }
        }
        
        /* Improved hover effects */
        .list-group-item-action:hover {
          background-color: rgba(0, 0, 0, 0.03) !important;
        }
        
        /* Better spacing for buttons on mobile */
        @media (max-width: 768px) {
          .notification-offcanvas .d-flex.gap-2 {
            gap: 0.5rem !important;
          }
          
          .notification-offcanvas .btn-outline-success,
          .notification-offcanvas .btn-outline-primary {
            padding: 0.25rem 0.5rem;
          }
        }
        
        /* Cleaner notification item styling */
        .notification-offcanvas .list-group-item {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .notification-offcanvas .list-group-item:hover {
          background-color: #f8f9fa;
        }
        
        .notification-offcanvas .list-group-item.bg-light:hover {
          background-color: #e9ecef !important;
        }
        
        /* View button styling */
        .notification-offcanvas .btn-outline-primary {
          border-width: 1px;
          font-weight: 500;
        }
      `}</style>
    </Offcanvas>
  );
};

export default NotificationList;