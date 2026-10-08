'use client';

import { useState } from 'react';
import { Button, Card, Alert, Spinner } from 'react-bootstrap';
import { Send, Bell, Bag, ExclamationTriangle } from 'react-bootstrap-icons';
import { toast } from 'sonner';

export default function DriverTestAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Test 1: Send real maintenance request (this triggers admin notifications)
  const sendRealMaintenanceRequest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // First get driver's car
      const carsRes = await fetch('/api/car/driver');
      const carsData = await carsRes.json();
      
      if (!carsData.data || carsData.data.length === 0) {
        toast.error('No car found for driver');
        setLoading(false);
        return;
      }
      
      const car = carsData.data[0];
      
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: car.id,
          title: 'TEST: Oil Change (Admin Notification Test)',
          description: 'This is a TEST maintenance request to check if admins receive notifications. PLEASE IGNORE.',
          amount: '99.99',
          garageName: 'Test Garage',
          garageContact: '123-456-7890'
        }),
      });
      
      const data = await response.json();
      setResult({
        type: 'MAINTENANCE_REQUEST',
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      if (response.ok) {
        toast.success('Maintenance request created! Admins should get notification.');
      } else {
        toast.error(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Test 2: Direct admin notification test
  const sendDirectAdminTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/notification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // Admin ID 1
          notification: {
            title: '🚨 DRIVER TEST: Admin Notification',
            body: 'Driver is testing if you receive this notification',
          },
          data: {
            type: 'DRIVER_TEST',
            test: 'true',
            timestamp: new Date().toISOString(),
            url: '/maint',
          }
        }),
      });
      
      const data = await response.json();
      setResult({
        type: 'DIRECT_TEST',
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      if (response.ok) {
        toast.success('Direct notification sent to Admin ID 1');
      } else {
        toast.error(`Failed: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Test 3: Check admin token status
  const checkAdminStatus = async () => {
    setLoading(true);
    
    try {
      // Simple check - see if admin has tokens in database
      const response = await fetch('/api/notification/check-admin-simple');
      const data = await response.json();
      
      setResult({
        type: 'ADMIN_CHECK',
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      if (response.ok && data.hasToken) {
        toast.success(`Admin ${data.adminId} has FCM token`);
      } else {
        toast.warning(`Admin ${data.adminId} has NO FCM token`);
      }
    } catch (error) {
      toast.error('Failed to check admin status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h1 className="h2 mb-2">🚗 Test Admin Notifications</h1>
        <p className="text-muted">Check if admins receive notifications when you submit maintenance requests</p>
      </div>
      
      {/* Test Cards */}
      <div className="row mb-4">
        {/* Test 1: Real Maintenance Request */}
        <div className="col-md-4 mb-3">
          <Card className="h-100 border-primary">
            <Card.Body className="text-center">
              <div className="mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center p-3">
                  <Bag size={30} className="text-primary" />
                </div>
              </div>
              <h5>Real Maintenance Request</h5>
              <p className="text-muted small mb-3">
                Create a real maintenance request (test data)
              </p>
              <Button 
                variant="primary" 
                onClick={sendRealMaintenanceRequest}
                disabled={loading}
                className="w-100"
              >
                {loading ? <Spinner size="sm" /> : 'Create Test Request'}
              </Button>
              <div className="mt-2 small text-muted">
                This tests the REAL notification flow
              </div>
            </Card.Body>
          </Card>
        </div>
        
        {/* Test 2: Direct Admin Test */}
        <div className="col-md-4 mb-3">
          <Card className="h-100 border-warning">
            <Card.Body className="text-center">
              <div className="mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex align-items-center justify-content-center p-3">
                  <Send size={30} className="text-warning" />
                </div>
              </div>
              <h5>Direct Admin Test</h5>
              <p className="text-muted small mb-3">
                Send direct notification to Admin (ID: 1)
              </p>
              <Button 
                variant="warning" 
                onClick={sendDirectAdminTest}
                disabled={loading}
                className="w-100"
              >
                {loading ? <Spinner size="sm" /> : 'Send to Admin'}
              </Button>
              <div className="mt-2 small text-muted">
                Tests if admin has valid FCM token
              </div>
            </Card.Body>
          </Card>
        </div>
        
        {/* Test 3: Check Admin Status */}
        <div className="col-md-4 mb-3">
          <Card className="h-100 border-info">
            <Card.Body className="text-center">
              <div className="mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 d-inline-flex align-items-center justify-content-center p-3">
                  <Bell size={30} className="text-info" />
                </div>
              </div>
              <h5>Check Admin Status</h5>
              <p className="text-muted small mb-3">
                Check if admin has FCM tokens
              </p>
              <Button 
                variant="info" 
                onClick={checkAdminStatus}
                disabled={loading}
                className="w-100"
              >
                {loading ? <Spinner size="sm" /> : 'Check Admin'}
              </Button>
              <div className="mt-2 small text-muted">
                Verifies admin notification setup
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
      
      {/* Instructions */}
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <strong>📋 How to Test</strong>
        </Card.Header>
        <Card.Body>
          <ol>
            <li className="mb-2">
              <strong>First:</strong> Click "Check Admin Status" - If admin has no token, you need to ask admin to enable notifications
            </li>
            <li className="mb-2">
              <strong>If admin has token:</strong> Click "Send to Admin" - This tests if token is valid
            </li>
            <li className="mb-2">
              <strong>Real test:</strong> Click "Create Test Request" - This creates a real maintenance request (like you normally would)
            </li>
            <li>
              <strong>Ask admin:</strong> After each test, ask admin if they received a notification
            </li>
          </ol>
        </Card.Body>
      </Card>
      
      {/* Result Display */}
      {result && (
        <Card className="mt-4">
          <Card.Header>
            <strong>Test Result</strong>
         
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <strong>Test Type:</strong> {result.type}<br/>
              <strong>Time:</strong> {new Date(result.timestamp).toLocaleTimeString()}
            </div>
            
            {result.data && (
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                maxHeight: '300px',
                overflow: 'auto',
                fontSize: '0.875rem'
              }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
            
            {/* Specific advice based on result */}
            {result.type === 'ADMIN_CHECK' && !result.data?.hasToken && (
              <Alert variant="warning" className="mt-3">
                <ExclamationTriangle className="me-2" />
                <strong>Admin has NO FCM token!</strong><br/>
                Ask admin to:<br/>
                1. Go to admin dashboard<br/>
                2. Click the bell icon in top right<br/>
                3. Enable notifications<br/>
                4. Allow browser permission
              </Alert>
            )}
            
            {result.type === 'DIRECT_TEST' && result.success && result.data?.successCount === 0 && (
              <Alert variant="danger" className="mt-3">
                <ExclamationTriangle className="me-2" />
                <strong>Notification sent but 0 devices received it!</strong><br/>
                Admin's FCM token is invalid or expired.<br/>
                Ask admin to disable and re-enable notifications.
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}
      
      {/* Quick Fix Card */}
      <Card className="mt-4 border-danger">
        <Card.Header className="bg-danger text-white">
          <strong>🚨 IF ADMINS DON'T GET NOTIFICATIONS</strong>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <strong>Problem:</strong> Admin has no valid FCM token<br/>
            <strong>Solution:</strong>
            <ol className="mt-2 mb-0">
              <li>Ask admin to open their dashboard</li>
              <li>Click the bell icon in top right menu</li>
              <li>Toggle notifications ON</li>
              <li>Allow browser permission when prompted</li>
              <li>Test again using buttons above</li>
            </ol>
          </Alert>
        </Card.Body>
      </Card>
    </div>
  );
}