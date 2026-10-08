// components/DebugNotificationStatus.tsx
'use client';

import { useState, useEffect } from 'react';

export default function DebugNotificationStatus({ userId }: { userId?: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [dbTokens, setDbTokens] = useState<any[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    // Check localStorage
    const storedToken = localStorage.getItem('fcm_token');
    addLog(`LocalStorage token: ${storedToken ? 'Found' : 'Not found'}`);
    
    // Check permission
    addLog(`Notification permission: ${Notification.permission}`);
    
    // Fetch tokens from DB
    if (userId) {
      fetch('/api/notification/debug-tokens?userId=' + userId)
        .then(res => res.json())
        .then(data => {
          setDbTokens(data.tokens || []);
          addLog(`Found ${data.tokens?.length || 0} tokens in database`);
          data.tokens?.forEach((token: any) => {
            addLog(`DB Token: ID=${token.id}, userId=${token.userId}, driverId=${token.driverId}`);
          });
        })
        .catch(err => addLog(`Error fetching DB tokens: ${err.message}`));
    }
  }, [userId]);

  return (
    <div className="fixed bottom-0 right-0 w-96 h-64 bg-gray-900 text-white p-4 overflow-auto text-xs z-50">
      <h4 className="text-sm font-bold mb-2">Notification Debug</h4>
      <div className="mb-4">
        <div className="font-semibold">Database Tokens:</div>
        {dbTokens.length === 0 ? (
          <div className="text-red-400">No tokens in database</div>
        ) : (
          <div>
            {dbTokens.map((token, idx) => (
              <div key={idx} className="border-b border-gray-700 py-1">
                <div>Token ID: {token.id}</div>
                <div>User ID: {token.userId || 'null'}</div>
                <div>Driver ID: {token.driverId || 'null'}</div>
                <div>Created: {new Date(token.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="font-semibold">Logs:</div>
      <div className="mt-1 space-y-1">
        {logs.map((log, idx) => (
          <div key={idx} className="font-mono">{log}</div>
        ))}
      </div>
    </div>
  );
}