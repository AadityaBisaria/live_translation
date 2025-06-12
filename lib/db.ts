import { Pool } from 'pg';

// Create a new pool using the connection details
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'voice_transcriptions',
  password: 'Postgres',
  port: 5432,
});

// Interface for Conversation data
interface Conversation {
  id: string;
  transcript: string;
  duration: number;
  timestamp: Date;
}

// Interface for Recording data
interface Recording {
  id: string;
  audio: Buffer;
  timestamp: Date;
}

// Function to save a conversation
export async function saveConversation(
  sessionId: string,
  transcript: string,
  duration: number
): Promise<Conversation> {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Insert the conversation
    const result = await client.query(
      `INSERT INTO conversation (id, transcript, duration)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sessionId, transcript, duration]
    );

    // Commit the transaction
    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error saving conversation:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Function to save a recording
export async function saveRecording(
  audioBuffer: Buffer
): Promise<Recording> {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Insert the recording
    const result = await client.query(
      `INSERT INTO recording (audio)
       VALUES ($1)
       RETURNING *`,
      [audioBuffer]
    );

    // Commit the transaction
    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error saving recording:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Function to get a conversation by ID
export async function getConversation(id: string): Promise<Conversation | null> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM conversation WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to get a recording by ID
export async function getRecording(id: string): Promise<Recording | null> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM recording WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting recording:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to get all conversations
export async function getAllConversations(): Promise<Conversation[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM conversation ORDER BY timestamp DESC'
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export the pool for direct access if needed
export { pool }; 