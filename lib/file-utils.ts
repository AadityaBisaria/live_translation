import { writeFile, readFile, appendFile } from 'fs/promises';
import { join } from 'path';

export async function appendToTranscriptFile(transcript: string, sessionId: string) {
  try {
    const timestamp = new Date().toISOString();
    const formattedEntry = `[${timestamp}] ${transcript}\n`;
    
    // Create the transcripts directory if it doesn't exist
    const transcriptPath = join(process.cwd(), 'public', 'transcripts', `${sessionId}.txt`);
    
    // Append the new transcription
    await appendFile(transcriptPath, formattedEntry);
    
    return transcriptPath;
  } catch (error) {
    console.error('Error appending to transcript file:', error);
    throw error;
  }
}

export async function getTranscriptFile(sessionId: string) {
  try {
    const transcriptPath = join(process.cwd(), 'public', 'transcripts', `${sessionId}.txt`);
    const content = await readFile(transcriptPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading transcript file:', error);
    throw error;
  }
} 