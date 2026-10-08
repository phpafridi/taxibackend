'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Form, Alert, Spinner, Table, Badge, Modal } from 'react-bootstrap';
import { Send, Bell, CheckCircle, XCircle, People, Person } from 'react-bootstrap-icons';

interface Driver {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  FcmTokens: Array<{
    id: number;
    token: string;
    platform: string | null;
  }>;
}

export default function TestNotificationsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(true);
  const [selectedDriverId, setSelectedDriverId] = useState<number | 'all'>('all');
  const [title, setTitle] = useState<string>('Test Notification');
  const [body, setBody] = useState<string>('This is a test notification message');
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load all drivers on component mount
  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoadingDrivers(true);
    setError(null);
    try {
      const response = await fetch('/api/test/get-drivers');
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDrivers(data.drivers || []);
        console.log(`Loaded ${data.drivers?.length || 0} drivers`);
      } else {
        throw new Error(data.error || 'Failed to load drivers');
      }
    } catch (error: any) {
      console.error('Error loading drivers:', error);
      setError(`Failed to load drivers: ${error.message}`);
      setResult({ 
        success: false, 
        message: `Error loading drivers: ${error.message}. Make sure the API endpoint exists.` 
      });
    } finally {
      setLoadingDrivers(false);
    }
  };

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      setResult({success: false, message: 'Title and body are required'});
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let response;
      let endpoint = '';
      
      if (selectedDriverId === 'all') {
        // Send to all drivers
        endpoint = '/api/test/send-to-all-drivers';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification: { title, body },
            data: {
              type: 'BROADCAST',
              timestamp: new Date().toISOString(),
              url: '/driver/dashboard',
            }
          }),
        });
      } else {
        // Send to specific driver
        endpoint = '/api/notification/send';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: selectedDriverId,
            notification: { title, body },
            data: {
              type: 'DRIVER_TEST',
              timestamp: new Date().toISOString(),
              url: '/driver/dashboard',
            }
          }),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: selectedDriverId === 'all' 
            ? `Notification sent to ${data.sentCount || 0} of ${drivers.length} drivers!` 
            : `Notification sent to driver! ${data.successCount ? `(Sent to ${data.successCount} device(s))` : ''}`
        });
        setShowSendModal(false);
      } else {
        setResult({
          success: false,
          message: `Failed: ${data.error || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}. Make sure the API endpoint exists.`
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestToDriver = (driverId: number) => {
    setSelectedDriverId(driverId);
    setTitle('Test Notification');
    setBody(`Hello, this is a test notification sent at ${new Date().toLocaleTimeString()}`);
    setShowSendModal(true);
  };

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-md-8">
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <People />
                Drivers List ({drivers.length})
              </h5>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger">
                  <strong>Error:</strong> {error}
                  <div className="mt-2">
                    <small>
                      Make sure you created the API endpoint at: <code>/app/api/test/get-drivers/route.ts</code>
                    </small>
                  </div>
                </Alert>
              )}
              
              {loadingDrivers ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading drivers...</p>
                </div>
              ) : drivers.length > 0 ? (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>FCM Tokens</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((driver) => (
                        <tr key={driver.id}>
                          <td>{driver.id}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Person />
                              {driver.user?.name || 'No Name'}
                            </div>
                          </td>
                          <td>{driver.user?.email || 'No Email'}</td>
                          <td>
                            <Badge bg={driver.FcmTokens.length > 0 ? 'success' : 'secondary'}>
                              {driver.FcmTokens.length} token(s)
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => sendTestToDriver(driver.id)}
                                disabled={driver.FcmTokens.length === 0}
                                title={driver.FcmTokens.length === 0 ? "No FCM tokens registered" : "Send test notification"}
                              >
                                <Send size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-info"
                                onClick={() => {
                                  setSelectedDriverId(driver.id);
                                  setShowSendModal(true);
                                }}
                              >
                                Custom
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert variant="warning">
                  No drivers found. 
                  
                </Alert>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-md-4">
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <Bell />
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedDriverId('all');
                    setShowSendModal(true);
                  }}
                  disabled={drivers.length === 0}
                >
                  <Send className="me-2" />
                  Send to All Drivers
                </Button>

                <Button
                  variant="outline-secondary"
                  onClick={loadDrivers}
                  disabled={loadingDrivers}
                >
                  {loadingDrivers ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Drivers List'
                  )}
                </Button>

                {drivers.length > 0 && (
                  <div className="mt-3">
                    <h6>Quick Templates:</h6>
                    <div className="d-grid gap-2">
                      <Button
                        variant="outline-success"
                        onClick={() => {
                          setSelectedDriverId('all');
                          setTitle('Weekly Payment Reminder');
                          setBody('Your weekly payment is due tomorrow. Please ensure payment is made on time.');
                          setShowSendModal(true);
                        }}
                      >
                        Payment Reminder
                      </Button>
                      
                      <Button
                        variant="outline-warning"
                        onClick={() => {
                          setSelectedDriverId('all');
                          setTitle('Maintenance Check');
                          setBody('Monthly maintenance check is due this week. Please schedule your appointment.');
                          setShowSendModal(true);
                        }}
                      >
                        Maintenance Alert
                      </Button>
                      
                      <Button
                        variant="outline-info"
                        onClick={() => {
                          setSelectedDriverId('all');
                          setTitle('Important Announcement');
                          setBody('There will be a mandatory meeting this Friday at 3 PM. Attendance is required.');
                          setShowSendModal(true);
                        }}
                      >
                        Meeting Announcement
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {result && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Result</h5>
              </Card.Header>
              <Card.Body>
                <Alert variant={result.success ? 'success' : 'danger'}>
                  <div className="d-flex align-items-center gap-2">
                    {result.success ? <CheckCircle /> : <XCircle />}
                    <span>{result.message}</span>
                  </div>
                </Alert>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>

      {/* Send Notification Modal */}
      <Modal show={showSendModal} onHide={() => setShowSendModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedDriverId === 'all' ? 'Send to All Drivers' : 'Send to Driver'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Notification Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notification Body</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notification message"
              />
            </Form.Group>

            {selectedDriverId !== 'all' && (
              <Alert variant="info">
                Sending to: <strong>
                  {drivers.find(d => d.id === selectedDriverId)?.user?.name || 'Unknown Driver'}
                </strong>
              </Alert>
            )}

            {selectedDriverId === 'all' && (
              <Alert variant="warning">
                This will send to all <strong>{drivers.length}</strong> drivers
                <div className="mt-1 small">
                  {drivers.filter(d => d.FcmTokens.length === 0).length > 0 && (
                    <span className="text-danger">
                      Note: {drivers.filter(d => d.FcmTokens.length === 0).length} drivers have no FCM tokens
                    </span>
                  )}
                </div>
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSendModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={sendNotification}
            disabled={loading || !title.trim() || !body.trim()}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="me-2" />
                Send Notification
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}