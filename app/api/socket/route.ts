import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { transcribeStream } from '@/lib/transcribe-stream';
import { saveConversation } from '@/lib/db';

// Create WebSocket server instance
const wss = new WebSocketServer({ noServer: true });

// Store active sessions
const sessions = new Map<string, {
  chunks: { data: Buffer; timestamp: number }[];
  transcript: string;
  startTime: number;
}>();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  let sessionId: string = Date.now().toString();  // Initialize with default value

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'start':
          sessionId = data.sessionId || Date.now().toString();
          sessions.set(sessionId, {
            chunks: [],
            transcript: '',
            startTime: Date.now()
          });
          ws.send(JSON.stringify({ type: 'started', sessionId }));
          break;

        case 'audio':
          const session = sessions.get(sessionId);
          if (!session) {
            throw new Error('Session not found');
          }

          // Store the audio chunk
          session.chunks.push({
            data: Buffer.from(data.audio, 'base64'),
            timestamp: Date.now()
          });

          // Process chunks in batches of 5
          if (session.chunks.length >= 5) {
            const chunksToProcess = session.chunks.splice(0, 5);
            const audioData = Buffer.concat(chunksToProcess.map(chunk => chunk.data));

            // Transcribe the chunks
            const transcribedText = await transcribeStream(audioData);
            
            // Update session transcript
            session.transcript += transcribedText + ' ';

            // Send transcribed text back to client
            ws.send(JSON.stringify({
              type: 'transcript',
              text: transcribedText,
              fullTranscript: session.transcript
            }));
          }
          break;

        case 'stop':
          const finalSession = sessions.get(sessionId);
          if (!finalSession) {
            throw new Error('Session not found');
          }

          // Process any remaining chunks
          if (finalSession.chunks.length > 0) {
            const audioData = Buffer.concat(finalSession.chunks.map(chunk => chunk.data));
            const transcribedText = await transcribeStream(audioData);
            finalSession.transcript += transcribedText + ' ';
          }

          // Save the conversation
          const duration = Date.now() - finalSession.startTime;
          await saveConversation(sessionId, finalSession.transcript, duration);

          // Send final transcript
          ws.send(JSON.stringify({
            type: 'complete',
            transcript: finalSession.transcript
          }));

          // Clean up
          sessions.delete(sessionId);
          break;
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  });

  ws.on('close', () => {
    if (sessionId) {
      sessions.delete(sessionId);
    }
  });
});

export async function GET(request: NextRequest) {
  try {
    // Check if it's a Socket.IO request
    const url = new URL(request.url);
    if (url.searchParams.has('transport')) {
      return new Response('Socket.IO not supported', { status: 400 });
    }

    // Handle WebSocket upgrade
    const { socket, response } = await new Promise<{ socket: any; response: Response }>((resolve) => {
      const { socket: rawSocket } = request as any;
      wss.handleUpgrade(request as any, rawSocket, Buffer.alloc(0), (ws) => {
        wss.emit('connection', ws, request);
        resolve({ socket: ws, response: new Response(null, { status: 101 }) });
      });
    });

    return response;
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('WebSocket connection failed', { status: 500 });
  }
} 