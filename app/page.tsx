"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, Square, Save, AlertCircle } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"

export default function VoiceTranscription() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [error, setError] = useState("")
  const [recordingEndTime, setRecordingEndTime] = useState("")
  const [finalDuration, setFinalDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Initialize WebSocket connection
  const { isConnected, sendMessage, lastMessage, error: wsError } = useWebSocket('/api/socket')

  // Handle incoming transcription messages
  useEffect(() => {
    if (lastMessage?.type === 'transcript') {
      setTranscript(prev => prev + (prev ? ' ' : '') + lastMessage.text)
    }
  }, [lastMessage])

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      setError(wsError)
      // If we're recording when connection is lost, stop recording
      if (isRecording) {
        stopRecording()
      }
    }
  }, [wsError, isRecording])

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Start recording
  const startRecording = async () => {
    try {
      if (!isConnected) {
        setError("Cannot start recording: WebSocket is not connected")
        return
      }

      setError("")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          // Send audio chunk through WebSocket
          sendMessage({
            type: 'audio',
            audio: event.data
          })
        }
      }

      // Set a smaller timeslice for more frequent data chunks
      mediaRecorder.start(100)
      setIsRecording(true)
      setDuration(0)
      setTranscript("")
      setSaveStatus("")

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)

    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
      console.error("Error accessing microphone:", err)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)

      // Send stop message
      sendMessage({ type: 'stop' })

      // Capture end time and final duration
      setFinalDuration(duration)
      const endTime = new Date()
      const timeString = endTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      setRecordingEndTime(timeString)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }

  // Save conversation
  const saveConversation = async () => {
    setIsSaving(true)
    setError("")

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

      // Prepare form data
      const formData = new FormData()
      formData.append("transcript", transcript)
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("duration", duration.toString())

      const response = await fetch("/api/save-conversation", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to save conversation")
      }

      const result = await response.json()
      const now = new Date()
      const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setSaveStatus(`Transcription saved at ${timeString}`)
    } catch (err) {
      setError("Failed to save conversation. Please try again.")
      console.error("Error saving conversation:", err)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Voice Transcription</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Recording Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                disabled={isSaving || !isConnected}
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-lg">
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}

            {transcript && !isRecording && (
              <Button
                onClick={saveConversation}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg disabled:opacity-50"
              >
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="flex items-center justify-center gap-3 text-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-gray-700">Recording: {formatDuration(duration)}</span>
            </div>
          )}

          {/* Recording Summary */}
          {!isRecording && transcript && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Recording Summary:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Total Duration:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">{formatDuration(finalDuration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Ended at:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border">{recordingEndTime}</span>
                </div>
              </div>
            </div>
          )}

          {/* Transcription Area */}
          {(transcript || isRecording) && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Live Transcription:</h3>
              <div
                ref={transcriptRef}
                className="bg-gray-100 border rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm leading-relaxed"
              >
                {transcript || (
                  <span className="text-gray-500 italic">Transcription will appear here as you speak...</span>
                )}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {saveStatus && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
              {saveStatus}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Instructions:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Click "Start Recording" to begin voice capture</li>
              <li>Speak clearly into your microphone</li>
              <li>Watch the live transcription appear in real-time</li>
              <li>Click "Stop Recording" when finished</li>
              <li>Click "Save" to store your transcription</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
