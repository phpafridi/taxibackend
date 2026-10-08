'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Bell, BellSlash, XCircle, ExclamationTriangle, CheckCircle } from 'react-bootstrap-icons';

interface NotificationEnableModalProps {
  show: boolean;
  onClose: () => void;
  onEnable: () => Promise<string | null>;
  onDisable: () => Promise<void>;
  isLoading: boolean;
  userId?: string;
  hasExistingToken?: boolean;
}

export default function NotificationEnableModal({
  show,
  onClose,
  onEnable,
  onDisable,
  isLoading,
  userId,
  hasExistingToken = false
}: NotificationEnableModalProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEnable = async () => {
    if (hasExistingToken) {
      console.log('Already has token, closing modal');
      onClose();
      return;
    }

    setEnableError(null);
    
    timeoutRef.current = setTimeout(() => {
      setEnableError("Request is taking too long. Please check your browser permissions and try again.");
    }, 10000);

    try {
      const token = await onEnable();
      if (token) {
        onClose();
      } else {
        setEnableError("Failed to enable notifications. Please try again.");
      }
    } catch (err: any) {
      console.error("Enable error:", err);
      setEnableError(err.message || "Failed to enable notifications");
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  const handleDisable = async () => {
    try {
      await onDisable();
      onClose();
    } catch (err: any) {
      console.error("Disable error:", err);
      setEnableError(err.message || "Failed to disable notifications");
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Modal show={show} onHide={() => setShowCloseConfirm(true)} centered>
        <Modal.Header className="bg-light">
          <Modal.Title className="d-flex align-items-center gap-2">
            {hasExistingToken ? (
              <CheckCircle className="text-success" />
            ) : (
              <Bell className="text-primary" />
            )}
            {hasExistingToken ? 'Notifications Already Enabled' : 'Enable Push Notifications'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {hasExistingToken ? (
            <div className="text-center mb-4">
              <CheckCircle size={48} className="text-success mb-3" />
              <h5 className="mb-3">Notifications Are Already Active</h5>
              <p className="text-muted">
                Your device is already registered to receive notifications. You don't need to enable them again.
              </p>
              <div className="alert alert-success small">
                <div className="d-flex align-items-center gap-2">
                  <CheckCircle size={16} />
                  <div>
                    <strong>✓ Already configured</strong>
                    <div className="small">Token is stored in database</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center mb-4">
              <Bell size={48} className="text-primary mb-3" />
              <h5 className="mb-3">Stay Updated in Real-Time</h5>
              <p className="text-muted">
                Get instant notifications about:
              </p>
              <ul className="text-start ps-4">
                <li>📋 New ride requests</li>
                <li>💰 Payment confirmations</li>
                <li>⚙️ Maintenance updates</li>
                <li>📅 Schedule changes</li>
                <li>🔔 Important announcements</li>
              </ul>
            </div>
          )}
          
          {enableError && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
              <ExclamationTriangle />
              <div className="small">{enableError}</div>
            </div>
          )}
          
          <div className="d-flex flex-column gap-2">
            {hasExistingToken ? (
              <Button
                variant="success"
                onClick={onClose}
                className="d-flex align-items-center justify-content-center gap-2"
              >
                <CheckCircle />
                Continue
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="d-flex align-items-center justify-content-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Bell />
                      Enable Notifications
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline-secondary"
                  onClick={handleDisable}
                  disabled={isLoading}
                  className="d-flex align-items-center justify-content-center gap-2"
                >
                  <BellSlash />
                  Not Now
                </Button>
              </>
            )}
          </div>
          
          {!hasExistingToken && (
            <div className="mt-3">
              <div className="alert alert-info small p-2 mb-2">
                <strong>Tip:</strong> If this hangs, check if your browser is blocking popups or notifications.
              </div>
              <div className="text-center text-muted small">
                <p>You can always enable/disable notifications in your account settings.</p>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showCloseConfirm} onHide={() => setShowCloseConfirm(false)} centered size="sm">
        <Modal.Body className="text-center">
          <XCircle size={48} className="text-warning mb-3" />
          <h5>Are you sure?</h5>
          <p className="text-muted">You'll miss important updates about your rides and payments.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="outline-secondary" onClick={() => setShowCloseConfirm(false)}>
              Cancel
            </Button>
            <Button variant="warning" onClick={onClose}>
              Continue Anyway
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}