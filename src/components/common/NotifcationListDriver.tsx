"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import { ListGroup, Offcanvas, Button, Badge, Spinner } from "react-bootstrap";
import { IconBell, IconCircleCheck } from "@tabler/icons-react";
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
      const response = await fetch('/api/notification/driver');
      
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
      
      const response = await fetch('/api/notification/driver', {
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
      className="notification-offcanvas-driver"
      style={{
        '--bs-offcanvas-width': 'min(400px, 100vw)',
        '--bs-offcanvas-height': '100vh'
      } as React.CSSProperties}
    >
      <div className="d-flex flex-column h-100">
        {/* Header - Fixed height */}
        <div className="sticky-top bg-white border-bottom">
          <Offcanvas.Header closeButton className="pb-2">
            <div className="d-flex justify-content-between w-100 align-items-center">
              <h5 className="mb-0 d-flex align-items-center fs-5 fs-md-4">
                <IconBell size={20} className="me-2" />
                Notifications
                {unreadCount > 0 && (
                  <Badge bg="danger" className="ms-2 fs-7">
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
                        <IconCircleCheck size={14} className="d-none d-md-inline me-1" />
                        <span className="d-none d-md-inline">Mark All</span>
                        <IconCircleCheck size={14} className="d-md-none" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Offcanvas.Header>
        </div>

        {/* Content Area - Takes remaining space */}
        <div className="flex-grow-1 overflow-hidden">
          <SimpleBar 
            style={{ 
              height: "100%",
              maxHeight: "100%"
            }}
            className="h-100"
          >
            {loading ? (
              <div className="text-center p-5">
                <Spinner 
                  animation="border" 
                  variant="primary" 
                  style={{ width: '3rem', height: '3rem' }}
                />
                <p className="text-muted mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-5 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <IconBell size={64} className="text-muted mb-3" />
                <p className="text-muted fs-5">No notifications yet</p>
                <small className="text-muted">When you get notifications, they'll appear here</small>
              </div>
            ) : (
              <ListGroup variant="flush">
                {notifications.map((notification) => (
                  <ListGroup.Item
                    key={notification.id}
                    action
                    className={`p-3 p-md-4 border-bottom notification-item ${!notification.isRead ? 'bg-light bg-opacity-25' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      {/* Left side - Icon and content */}
                      <div className="d-flex gap-2 gap-md-3 flex-grow-1">
                        {/* Icon with notification dot */}
                        <div className="position-relative flex-shrink-0">
                          <div className="icon-shape icon-sm icon-md-md bg-light rounded-circle d-flex align-items-center justify-content-center">
                            <span className="fs-4 fs-md-3">{getNotificationIcon(notification.type)}</span>
                          </div>
                          {!notification.isRead && (
                            <div className="position-absolute top-0 start-100 translate-middle">
                              <Badge bg="primary" pill className="p-1" />
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-grow-1 min-width-0">
                          {/* Title and badge row */}
                          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-1 gap-md-2 mb-1">
                            <h6 className="mb-0 fs-6 text-truncate">{notification.title}</h6>
                            <Badge bg="secondary" className="fs-8 flex-shrink-0">
                              {getNotificationTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          
                          {/* Message - responsive text size */}
                          <p className="mb-1 text-muted fs-7 text-break">{notification.message}</p>
                          
                          {/* Timestamp and action indicator */}
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </small>
                            
                            {/* Action indicator for notifications with actionUrl */}
                            {notification.actionUrl && (
                              <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 fs-8">
                                Click to view details
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </SimpleBar>
        </div>
      </div>
      
      <style jsx global>{`
        /* Responsive styles for mobile and desktop */
        .notification-offcanvas-driver {
          width: 100% !important;
          max-width: 400px !important;
        }
        
        @media (max-width: 576px) {
          .notification-offcanvas-driver {
            width: 100vw !important;
            max-width: 100vw !important;
          }
          
          .notification-offcanvas-driver .offcanvas-header {
            padding: 1rem;
          }
          
          .notification-offcanvas-driver .offcanvas-body {
            padding: 0;
          }
          
          .notification-offcanvas-driver .list-group-item {
            padding: 1rem !important;
          }
          
          .notification-offcanvas-driver .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }
          
          /* Adjust icon sizes for mobile */
          .notification-offcanvas-driver .icon-shape {
            width: 40px !important;
            height: 40px !important;
          }
          
          .notification-offcanvas-driver .icon-shape span {
            font-size: 1.5rem !important;
          }
        }
        
        @media (min-width: 577px) and (max-width: 768px) {
          .notification-offcanvas-driver {
            width: 350px !important;
          }
        }
        
        @media (min-width: 769px) {
          .notification-offcanvas-driver {
            width: 400px !important;
          }
        }
        
        /* Improved hover effects */
        .notification-item:hover {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }
        
        .notification-item.bg-light:hover {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
        
        /* Better spacing for buttons on mobile */
        @media (max-width: 768px) {
          .notification-offcanvas-driver .d-flex.gap-2 {
            gap: 0.5rem !important;
          }
          
          .notification-offcanvas-driver .btn-outline-success {
            padding: 0.25rem 0.5rem;
          }
        }
        
        /* Icon shape sizing */
        .icon-shape.icon-sm {
          width: 48px;
          height: 48px;
        }
        
        @media (max-width: 768px) {
          .icon-shape.icon-sm {
            width: 40px;
            height: 40px;
          }
        }
        
        .icon-shape.icon-md-md {
          width: 56px;
          height: 56px;
        }
        
        /* Text responsiveness */
        .fs-7 {
          font-size: 0.875rem !important;
        }
        
        .fs-8 {
          font-size: 0.75rem !important;
        }
        
        @media (max-width: 768px) {
          .fs-5 {
            font-size: 1.1rem !important;
          }
          
          .fs-6 {
            font-size: 0.95rem !important;
          }
          
          .fs-7 {
            font-size: 0.8rem !important;
          }
          
          .fs-8 {
            font-size: 0.7rem !important;
          }
        }
        
        /* Animation for notification items */
        .notification-item {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        /* Action indicator styling */
        .notification-offcanvas-driver .badge.bg-info {
          padding: 0.25rem 0.5rem;
          font-weight: 500;
        }
        
        /* Safe area support for mobile devices */
        @supports (padding: max(0px)) {
          .notification-offcanvas-driver {
            padding-top: max(1rem, env(safe-area-inset-top)) !important;
            padding-bottom: max(1rem, env(safe-area-inset-bottom)) !important;
          }
        }
        
        /* Smooth scrolling */
        .notification-offcanvas-driver .simplebar-scrollbar::before {
          background-color: rgba(0, 0, 0, 0.3) !important;
        }
      `}</style>
    </Offcanvas>
  );
};

export default NotificationList;