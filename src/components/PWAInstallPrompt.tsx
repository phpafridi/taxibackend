'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import {
  Download as IconDownload,
  X as IconClose,
  Phone as IconPhone,
} from 'react-bootstrap-icons';

// Define the BeforeInstallPromptEvent type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const checkStandalone = () => {
      // @ts-ignore - display-mode might not be in all browsers
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      // @ts-ignore - standalone might not be in all browsers
      if (window.navigator.standalone) {
        return true;
      }
      return false;
    };

    setIsStandalone(checkStandalone());

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Handle beforeinstallprompt event (for Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallEvent);
      
      // Show prompt after 3 seconds
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!hasSeenPrompt && !isIOSDevice && isMobile) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Check for iOS and show special instructions
    if (isIOSDevice) {
      const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
      setTimeout(() => {
        if (!hasSeenPrompt) {
          setShowPrompt(true);
        }
      }, 3000);
    }

    // Add event listener
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the install prompt`);
        
        if (outcome === 'accepted') {
          console.log('PWA installed successfully');
        }
      } catch (error) {
        console.error('Error installing PWA:', error);
      }
      
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  if (isStandalone) {
    return null;
  }

  return (
    <Modal 
      show={showPrompt} 
      onHide={handleClose} 
      centered 
      backdrop="static"
      keyboard={false}
      className="pwa-install-modal"
    >
      <Modal.Header closeButton className="border-bottom-0">
        <Modal.Title className="w-100 text-center">
          {isIOS ? 'Add to Home Screen' : 'Install App'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        <div className="mb-4">
          <div className="d-flex justify-content-center align-items-center mb-3">
            <div className="rounded-circle bg-primary bg-opacity-10 p-3">
              {isIOS ? (
                <IconPhone size={40} className="text-primary" />
              ) : (
                <IconDownload size={40} className="text-primary" />
              )}
            </div>
          </div>
          
          {isIOS ? (
            <>
              <h5 className="mb-2">Install on iOS</h5>
              <p className="text-muted mb-3">
                To install this app:
              </p>
              <div className="text-start">
                <ol className="mb-0 ps-3">
                  <li className="mb-2">Tap the <strong>Share</strong> button <span className="badge bg-secondary">⎋</span></li>
                  <li className="mb-2">Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right</li>
                </ol>
              </div>
            </>
          ) : (
            <>
              <h5 className="mb-2">Install App</h5>
              <p className="text-muted mb-3">
                Install for better experience, offline access, and quick launch.
              </p>
              <div className="text-start">
                <ul className="list-unstyled mb-0">
                  <li className="mb-2 d-flex align-items-center">
                    <span className="badge bg-success me-2">✓</span>
                    <span>Quick access from home screen</span>
                  </li>
                  <li className="mb-2 d-flex align-items-center">
                    <span className="badge bg-success me-2">✓</span>
                    <span>Works offline</span>
                  </li>
                  <li className="mb-2 d-flex align-items-center">
                    <span className="badge bg-success me-2">✓</span>
                    <span>Faster loading</span>
                  </li>
                  <li className="d-flex align-items-center">
                    <span className="badge bg-success me-2">✓</span>
                    <span>Push notifications</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-top-0 pt-0">
        <div className="d-grid gap-2 w-100">
          <Button 
            variant="outline-secondary" 
            onClick={handleClose}
            className="py-2"
          >
            <IconClose className="me-2" />
            Not Now
          </Button>
          
          {!isIOS && deferredPrompt && (
            <Button 
              variant="primary" 
              onClick={handleInstall}
              className="py-2"
            >
              <IconDownload className="me-2" />
              Install Now
            </Button>
          )}
          
          {isIOS && (
            <Button 
              variant="primary" 
              onClick={handleClose}
              className="py-2"
            >
              Got It!
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default PWAInstallPrompt;