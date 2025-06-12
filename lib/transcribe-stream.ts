import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function transcribeStream(audioData: Buffer): Promise<string> {
  try {
    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.1, // Lower temperature for more accurate transcription
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    });

    // Convert audio buffer to base64
    const base64Audio = audioData.toString('base64');

    // Create the prompt for transcription
    const prompt = `Please transcribe the following audio data (base64 encoded): ${base64Audio}. 
    Focus on accuracy and maintain proper punctuation. 
    If the audio is unclear or contains background noise, indicate this in the transcription.`;

    // Generate transcription
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const transcription = response.text();

    if (!transcription) {
      throw new Error('No transcription generated');
    }

    return transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio: ' + (error as Error).message);
  }
} 