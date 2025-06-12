import { useState, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';

export function RecordingButton() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [transcript, setTranscript] = useState('');

  const { sendAudioData, startRecording, stopRecording } = useSocket({
    onTranscript: (text, fullTranscript) => {
      setTranscript(fullTranscript);
    },
    onError: (message) => {
      console.error('Error:', message);
      // Handle error (show notification, etc.)
    },
    onSaved: (data) => {
      console.log('Recording saved:', data);
      // Handle save success (show notification, etc.)
    }
  });

  const startRecordingHandler = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          sendAudioData(event.data);
        }
      };

      mediaRecorder.start(1000); // Send data every second
      setIsRecording(true);
      startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecordingHandler = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      stopRecording();
    }
  };

  return (
    <div>
      <button
        onClick={isRecording ? stopRecordingHandler : startRecordingHandler}
        className={`px-4 py-2 rounded ${
          isRecording ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {transcript && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
} 