import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface TranscriptionResult {
  text: string;
  error?: string;
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  try {
    // Convert blob to base64
    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    const base64Audio = buffer.toString('base64');

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Create a more specific prompt for transcription
    const prompt = `Please transcribe the following audio data accurately. 
    The audio is base64 encoded. 
    Return only the transcribed text without any additional commentary or formatting.
    Audio data: ${base64Audio}`;

    // Generate transcription
    const result = await model.generateContent(prompt);
    const transcription = result.response.text();

    // Clean up the transcription (remove any extra whitespace or formatting)
    const cleanedTranscription = transcription.trim();

    return {
      text: cleanedTranscription
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Failed to transcribe audio'
    };
  }
} 