import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { appendToTranscriptFile } from '@/lib/file-utils';
import { saveConversation, saveRecording } from '@/lib/db';

// Define the conversation type
interface Conversation {
  transcript: string;
  audio: Blob;
  duration: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcript = formData.get('transcript') as string;
    const audio = formData.get('audio') as Blob;
    const sessionId = formData.get('sessionId') as string;

    if (!transcript || !audio || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert audio blob to buffer
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    
    // Save audio file to filesystem
    const filename = `${sessionId}.webm`;
    const audioPath = join(process.cwd(), 'public', 'recordings', filename);
    await writeFile(audioPath, audioBuffer);

    // Save to database
    const [conversation, recording] = await Promise.all([
      saveConversation(sessionId, transcript, Date.now() - parseInt(sessionId)),
      saveRecording(audioBuffer)
    ]);

    // Append transcript to text file
    await appendToTranscriptFile(sessionId, transcript);

    return NextResponse.json({
      success: true,
      conversation,
      recording,
      audioPath: `/recordings/${filename}`,
      transcriptPath: `/transcripts/${sessionId}.txt`
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
