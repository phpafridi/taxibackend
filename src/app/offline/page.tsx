'use client';

import { Button, Card } from 'react-bootstrap';
import { WifiOff, ArrowClockwise, House } from 'react-bootstrap-icons';
import Link from 'next/link';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="text-center py-5">
        <Card className="border-0 shadow-lg" style={{ maxWidth: '500px' }}>
          <Card.Body className="p-5">
            <div className="mb-4">
              <div className="bg-warning rounded-circle p-4 d-inline-block">
                <WifiOff size={64} className="text-white" />
              </div>
            </div>
            
            <h1 className="mb-3">You're Offline</h1>
            <p className="text-muted mb-4">
              It looks like you've lost your internet connection. Please check your connection and try again.
            </p>
            
            <div className="d-grid gap-3">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleRetry}
                className="d-flex align-items-center justify-content-center"
              >
                <ArrowClockwise className="me-2" />
                Retry Connection
              </Button>
              
              <Link href="/" passHref>
                <Button 
                  variant="outline-secondary" 
                  size="lg"
                  className="d-flex align-items-center justify-content-center"
                >
                  <House className="me-2" />
                  Go to Home
                </Button>
              </Link>
            </div>
            
            <div className="mt-5 pt-4 border-top">
              <h6 className="text-muted mb-3">Offline Capabilities:</h6>
              <div className="row text-start">
                <div className="col-6">
                  <ul className="list-unstyled">
                    <li className="mb-2">✓ View cached requests</li>
                    <li className="mb-2">✓ Access documents</li>
                  </ul>
                </div>
                <div className="col-6">
                  <ul className="list-unstyled">
                    <li className="mb-2">✓ View images</li>
                    <li className="mb-2">✓ Read descriptions</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}