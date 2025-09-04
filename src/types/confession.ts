export interface Confession {
  id: string;
  type: "text" | "video";
  content: string;
  videoUri?: string;
  transcription?: string;
  timestamp: number;
  isAnonymous: boolean;
}

export interface ConfessionState {
  confessions: Confession[];
  addConfession: (confession: Omit<Confession, "id" | "timestamp">) => void;
  deleteConfession: (id: string) => void;
  clearAllConfessions: () => void;
}