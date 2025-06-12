import { useState, useEffect, useCallback } from 'react';

interface UseSocketProps {
  onTranscript: (text: string, fullTranscript: string) => void;
  onError: (message: string) => void;
  onSaved: (data: any) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function useSocket({ 
  onTranscript, 
  onError, 
  onSaved,
  onConnectionChange 
}: UseSocketProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const pathOnly = new URL('/api/socket', window.location.origin).pathname;
    const wsUrl = `${protocol}://${window.location.host}${pathOnly}?sessionId=${Date.now()}`;
    console.log('Connecting to WebSocket:', wsUrl); // Debug log
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setSocket(ws);
      setIsConnected(true);
      setSessionId(ws.url.split('sessionId=')[1]);
      onConnectionChange?.(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transcript':
          onTranscript(data.text, data.fullTranscript);
          break;
        case 'saved':
          onSaved(data.data);
          break;
        case 'error':
          onError(data.message);
          break;
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setIsConnected(false);
      onConnectionChange?.(false);
      if (!event.wasClean) {
        onError(`Connection closed unexpectedly: ${event.code} ${event.reason}`);
      }
    };

    ws.onerror = (event) => {
      const error = event instanceof ErrorEvent ? event.message : 'Unknown WebSocket error';
      console.error('WebSocket error:', error);
      setIsConnected(false);
      onConnectionChange?.(false);
      onError('WebSocket connection error: ' + error);
    };

    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [onTranscript, onError, onSaved, onConnectionChange]);

  // Function to send audio data
  const sendAudioData = useCallback((audioData: Blob) => {
    if (socket && isRecording && isConnected) {
      socket.send(audioData);
    } else if (!isConnected) {
      onError('Cannot send audio data: WebSocket is not connected');
    }
  }, [socket, isRecording, isConnected, onError]);

  // Function to stop recording
  const stopRecording = useCallback(() => {
    if (socket && isRecording && isConnected) {
      socket.send(JSON.stringify({ type: 'stop' }));
      setIsRecording(false);
    } else if (!isConnected) {
      onError('Cannot stop recording: WebSocket is not connected');
    }
  }, [socket, isRecording, isConnected, onError]);

  // Function to start recording
  const startRecording = useCallback(() => {
    if (isConnected) {
      setIsRecording(true);
    } else {
      onError('Cannot start recording: WebSocket is not connected');
    }
  }, [isConnected, onError]);

  return {
    isRecording,
    isConnected,
    sessionId,
    sendAudioData,
    startRecording,
    stopRecording
  };
} 