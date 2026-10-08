'use client';

import { useFirebaseNotifications } from '../hooks/useFirebaseNotification';
import NotificationEnableModal from './NotificationEnableModal';
import { useState, useEffect } from 'react';
import { Bell, BellSlash, CheckCircle, XCircle, InfoCircle } from 'react-bootstrap-icons';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Spinner } from 'react-bootstrap';

interface NotificationManagerProps {
  userId?: string;
  showStatus?: boolean;
  dropdownMode?: boolean;
}

export default function NotificationManager({
  userId,
  showStatus = false,
  dropdownMode = false
}: NotificationManagerProps) {
  const { data: session } = useSession();
  const {
    fcmToken,
    permission,
    isSupported,
    isLoading,
    error,
    requestPermission,
    revokePermission,
    currentNotification,
    clearNotification,
    shouldShowPrompt,
    setShowPrompt
  } = useFirebaseNotifications(userId);

  const [showSettings, setShowSettings] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasTokenInDB, setHasTokenInDB] = useState<boolean>(false);
  const [checkingDB, setCheckingDB] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check user role and database token status
  useEffect(() => {
    const checkUserAndTokenStatus = async () => {
      if (!session?.user?.id || !session?.user?.role) {
        console.log('No session user found');
        return;
      }

      console.log('Checking user role and token status on login...');
      setUserRole(session.user.role);

      try {
        setCheckingDB(true);
        
        // Check if user has token in database
        const response = await fetch(`/api/notification/check-token?userId=${session.user.id}`);
        const data = await response.json();
        
        if (response.ok) {
          setHasTokenInDB(data.hasToken);
          console.log('Token check result:', data);
          
          const hasSeenPrompt = localStorage.getItem('notification_prompt_seen');
          
          if (permission === 'default' && !data.hasToken && !hasSeenPrompt) {
            setTimeout(() => {
              setShowPrompt(true);
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Error checking token status:', err);
      } finally {
        setCheckingDB(false);
      }
    };

    checkUserAndTokenStatus();
  }, [session, permission, setShowPrompt]);

  // Handle new notifications
  useEffect(() => {
    if (currentNotification) {
      console.log('New notification received:', currentNotification);
      
      toast.info(currentNotification.title, {
        description: currentNotification.body,
        duration: 5000,
        position: isMobile ? 'top-center' : 'top-right',
        action: currentNotification.data?.url ? {
          label: 'View',
          onClick: () => window.open(currentNotification.data?.url, '_blank')
        } : undefined,
      });
      
      const timer = setTimeout(() => {
        clearNotification();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentNotification, clearNotification, isMobile]);

  // Handle toggle button click directly
  const handleToggleClick = async () => {
    // Don't do anything if still loading or checking
    if (isLoading || checkingDB) {
      return;
    }

    console.log('Toggle clicked - Current state:', {
      permission,
      hasToken: !!fcmToken,
      hasTokenInDB,
      userRole
    });

    // If notifications are enabled, disable them
    if (permission === 'granted' && fcmToken && hasTokenInDB) {
      await handleDisableNotifications();
      return;
    }

    // If notifications are disabled, enable them
    if (permission === 'default' || permission === 'denied' || !fcmToken || !hasTokenInDB) {
      await handleEnableNotifications();
      return;
    }
  };

  // Handle enabling notifications
  const handleEnableNotifications = async (): Promise<string | null> => {
    console.log('Manual enable triggered');
    
    const loadingToast = toast.loading('Setting up notifications...', {
      position: isMobile ? 'top-center' : 'top-right',
    });
    
    try {
      const token = await requestPermission();
      
      if (token) {
        toast.dismiss(loadingToast);
        toast.success('Success!', {
          description: 'Notifications have been enabled successfully.',
          position: isMobile ? 'top-center' : 'top-right',
        });
        setShowSettings(false);
        return token;
      }
      
      toast.dismiss(loadingToast);
      if (error) {
        toast.error('Failed', {
          description: error,
          position: isMobile ? 'top-center' : 'top-right',
        });
      }
      return null;
      
    } catch (err: any) {
      console.error('Enable error:', err);
      toast.dismiss(loadingToast);
      toast.error('Error', {
        description: err.message || 'Failed to enable notifications',
        position: isMobile ? 'top-center' : 'top-right',
      });
      return null;
    }
  };

  // Handle disabling notifications
  const handleDisableNotifications = async () => {
    console.log('Manual disable triggered');
    
    const loadingToast = toast.loading('Disabling notifications...', {
      position: isMobile ? 'top-center' : 'top-right',
    });
    
    try {
      await revokePermission();
      setHasTokenInDB(false);
      toast.dismiss(loadingToast);
      toast.info('Notifications Disabled', {
        description: 'You will no longer receive push notifications.',
        position: isMobile ? 'top-center' : 'top-right',
      });
      setShowSettings(false);
    } catch (err: any) {
      console.error('Disable error:', err);
      toast.dismiss(loadingToast);
      toast.error('Error', {
        description: 'Failed to disable notifications',
        position: isMobile ? 'top-center' : 'top-right',
      });
    }
  };

  const handleModalDisable = async (): Promise<void> => {
    localStorage.setItem('notification_prompt_seen', 'true');
    setShowPrompt(false);
    
    toast.info('No Problem!', {
      description: 'You can enable notifications later from the toggle.',
      position: isMobile ? 'top-center' : 'top-right',
    });
    
    return Promise.resolve();
  };

  const handleModalEnable = handleEnableNotifications;

  if (!isSupported) {
    return null;
  }

  // Get bell status for display - UPDATED COLORS
  const getBellStatus = () => {
    if (permission === 'granted' && fcmToken && hasTokenInDB) {
      return {
        Icon: Bell,
        color: 'text-success', // Green when enabled
        bgColor: 'bg-success bg-opacity-10',
        title: 'Notifications Enabled ✓',
        text: 'Enabled'
      };
    }
    if (permission === 'denied') {
      return {
        Icon: XCircle,
        color: 'text-danger',
        bgColor: 'bg-danger bg-opacity-10',
        title: 'Notifications Blocked',
        text: 'Blocked'
      };
    }
    if (isLoading || checkingDB) {
      return {
        Icon: Bell,
        color: 'text-warning',
        bgColor: 'bg-warning bg-opacity-10',
        title: 'Checking status...',
        text: 'Checking...'
      };
    }
    if (permission === 'granted' && (!fcmToken || !hasTokenInDB)) {
      return {
        Icon: BellSlash,
        color: 'text-warning',
        bgColor: 'bg-warning bg-opacity-10',
        title: 'Setup Required',
        text: 'Setup required'
      };
    }
    // Default/disabled state - YELLOW
    return {
      Icon: Bell,
      color: 'text-warning', // Yellow when disabled
      bgColor: 'bg-warning bg-opacity-10',
      title: 'Notifications Disabled',
      text: 'Disabled'
    };
  };

  const bellStatus = getBellStatus();
  const BellIcon = bellStatus.Icon;

  // If in dropdown mode, render the dropdown version
  if (dropdownMode) {
    return (
      <>
        <NotificationEnableModal
          show={shouldShowPrompt && permission === 'default' && !hasTokenInDB}
          onClose={() => {
            localStorage.setItem('notification_prompt_seen', 'true');
            setShowPrompt(false);
          }}
          onEnable={handleModalEnable}
          onDisable={handleModalDisable}
          isLoading={isLoading}
          userId={userId}
          hasExistingToken={hasTokenInDB && permission === 'granted'}
        />

        {/* Dropdown mode - for UserMenu */}
        <div className="border-dashed border-top border-bottom mb-0 px-4 py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div className={`rounded-circle p-2 ${bellStatus.bgColor}`}>
                <BellIcon size={16} className={bellStatus.color} />
              </div>
              <div>
                <div className="fw-medium small">Push Notifications</div>
                <div className={`extra-small ${bellStatus.color}`}>
                  {checkingDB ? 'Checking status...' : bellStatus.text}
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {checkingDB && (
                <Spinner animation="border" size="sm" variant="warning" />
              )}
              
              {/* Toggle Switch */}
              <div 
                className={`d-inline-flex align-items-center ${isLoading || checkingDB ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={handleToggleClick}
                style={{ userSelect: 'none' }}
                title={bellStatus.title}
              >
                <div 
                  className="position-relative rounded-pill transition-all"
                  style={{
                    width: '44px',
                    height: '20px',
                    backgroundColor: (permission === 'granted' && hasTokenInDB) ? '#4CAF50' : '#FFA726', // Green for enabled, Yellow/Orange for disabled
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <div 
                    className="position-absolute bg-white rounded-circle shadow-sm transition-all"
                    style={{
                      width: '26px',
                      height: '26px',
                      top: '-3px',
                      left: (permission === 'granted' && hasTokenInDB) ? '22px' : '-3px',
                      transition: 'left 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
                <span className={`ms-2 small ${bellStatus.color}`}>
                  {(permission === 'granted' && hasTokenInDB) ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Status Information (always visible) */}
          <div className="mt-2">
            {error && (
              <div className="alert alert-danger mb-0 p-2 small">
                <div className="d-flex align-items-start gap-1">
                  <XCircle size={14} className="mt-1" />
                  <div>
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              </div>
            )}
            
            {permission === 'denied' && (
              <div className="alert alert-warning mb-0 p-2 small">
                <div className="d-flex align-items-center gap-1">
                  <InfoCircle size={14} />
                  <div>
                    Notifications blocked in browser. Enable in browser settings.
                  </div>
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="text-center p-2 small text-muted">
                <Spinner animation="border" size="sm" className="me-2" />
                Processing...
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Original floating button mode (default) - Updated colors
  return (
    <>
      <NotificationEnableModal
        show={shouldShowPrompt && permission === 'default' && !hasTokenInDB}
        onClose={() => {
          localStorage.setItem('notification_prompt_seen', 'true');
          setShowPrompt(false);
        }}
        onEnable={handleModalEnable}
        onDisable={handleModalDisable}
        isLoading={isLoading}
        userId={userId}
        hasExistingToken={hasTokenInDB && permission === 'granted'}
      />

      {showStatus && (
        <div className={`position-fixed ${isMobile ? 'bottom-4 end-4' : 'bottom-3 end-3'} z-3`}>
          <button
            onClick={handleToggleClick}
            className={`btn rounded-circle shadow-lg position-relative ${
              (permission === 'granted' && hasTokenInDB) 
                ? 'btn-success' 
                : permission === 'denied' 
                  ? 'btn-danger' 
                  : 'btn-warning' // Yellow for disabled state
            }`}
            style={{ 
              width: isMobile ? '56px' : '50px', 
              height: isMobile ? '56px' : '50px',
              padding: isMobile ? '0.75rem' : '0.5rem'
            }}
            title={bellStatus.title}
            disabled={isLoading || checkingDB}
            aria-label="Notification settings"
          >
            <BellIcon size={isMobile ? 24 : 20} />
            {checkingDB && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info">
                <span className="spinner-border spinner-border-sm" />
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}