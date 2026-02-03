export type ChunkMode = 'sentence' | 'paragraph' | 'chapter';

export interface Chunk {
  index: number;
  text: string;
  /** Optional chapter number if chunk mode is chapter or if detected */
  chapter?: number;
}

export interface MentalState {
  scene: string;
  charactersPresent: string[];
  mood: string;
  predictions: string[];
  questions: string[];
  emotionalResponse: string;
}

export interface JournalEntry {
  chunkIndex: number;
  timestamp: string;
  chunkText: string;
  imagination: string;
  mentalState: MentalState;
  predictionsResolved?: Array<{
    prediction: string;
    correct: boolean;
    note?: string;
  }>;
}

export interface ReadingSession {
  id: string;
  bookPath: string;
  title: string;
  author?: string;
  chunkMode: ChunkMode;
  currentChunk: number;
  totalChunks: number;
  mentalState: MentalState;
  journal: JournalEntry[];
  startedAt: string;
  lastReadAt: string;
}

export interface ReaderOutput {
  imagination: string;
  mentalState: MentalState;
}

export const INITIAL_MENTAL_STATE: MentalState = {
  scene: '',
  charactersPresent: [],
  mood: '',
  predictions: [],
  questions: [],
  emotionalResponse: '',
};
