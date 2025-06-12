import { useState, useEffect, useCallback } from 'react';

interface WebSocketHook {
  isConnected: boolean;
  sendMessage: (data: any) => void;
  lastMessage: any;
  error: string | null;
}

export function useWebSocket(url: string): WebSocketHook {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const pathOnly = new URL(url, window.location.origin).pathname;
    const wsUrl = `${protocol}://${window.location.host}${pathOnly}`;
    console.log('Connecting to WebSocket:', wsUrl); // Debug log
    const socketInstance = new WebSocket(wsUrl);

    // Connection event handlers
    socketInstance.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setError(null);
    };

    socketInstance.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setIsConnected(false);
      if (!event.wasClean) {
        setError(`Connection closed unexpectedly: ${event.code} ${event.reason}`);
      }
    };

    socketInstance.onerror = (event) => {
      const error = event instanceof ErrorEvent ? event.message : 'Unknown WebSocket error';
      setError('Connection error: ' + error);
      console.error('WebSocket error:', error);
    };

    // Message handler
    socketInstance.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);
    };

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.close();
    };
  }, [url]);

  const sendMessage = useCallback((data: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(data));
    } else {
      setError('Cannot send message: WebSocket is not connected');
    }
  }, [socket, isConnected]);

  return {
    isConnected,
    sendMessage,
    lastMessage,
    error
  };
} 