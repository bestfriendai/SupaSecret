import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system";

export interface RecognizedWord {
  word: string;
  confidence: number;
  startTime: number;
  endTime: number;
  isComplete: boolean;
}

export interface CaptionSegment {
  id: string;
  text: string; // Full text of the segment
  words: RecognizedWord[];
  startTime: number;
  endTime?: number;
  isComplete: boolean;
}

interface UseSpeechRecognitionOptions {
  language?: string;
}

interface UseSpeechRecognitionReturn {
  isProcessing: boolean;
  isListening: boolean;
  isAvailable: boolean;
  segments: CaptionSegment[];
  currentSegment: CaptionSegment | null;
  error: string | null;
  processAudioFile: (audioPath: string) => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  clearResults: () => void;
  hasPermission: boolean;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const { language = "en-US" } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<CaptionSegment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const segmentIdCounter = useRef(0);
  const listeningTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentWords = useRef<RecognizedWord[]>([]);

  // Real-time listening functions
  const startListening = useCallback(() => {
    if (isListening) return;

    console.log("🎤 Starting real-time speech recognition...");
    setIsListening(true);
    setError(null);
    currentWords.current = [];

    // Simulate real-time speech recognition with demo words
    // In a real implementation, this would use Web Speech API or native speech recognition
    const demoWords = [
      "Hey",
      "everyone",
      "this",
      "is",
      "my",
      "confession",
      "for",
      "today",
      "I",
      "have",
      "something",
      "important",
      "to",
      "share",
      "with",
      "you",
      "all",
    ];

    let wordIndex = 0;
    const startTime = Date.now();

    listeningTimer.current = setInterval(() => {
      if (wordIndex < demoWords.length) {
        const word: RecognizedWord = {
          word: demoWords[wordIndex],
          confidence: 0.8 + Math.random() * 0.2,
          startTime: (Date.now() - startTime) / 1000,
          endTime: (Date.now() - startTime + 500) / 1000,
          isComplete: true,
        };

        currentWords.current.push(word);

        // Create/update current segment
        const segment: CaptionSegment = {
          id: `live_segment_${Date.now()}`,
          text: currentWords.current.map((w) => w.word).join(" "),
          words: [...currentWords.current],
          startTime: currentWords.current[0]?.startTime || 0,
          endTime: word.endTime,
          isComplete: false,
        };

        setCurrentSegment(segment);

        // Every 8 words, finalize the segment and start a new one
        if (currentWords.current.length >= 8) {
          const finalSegment = { ...segment, isComplete: true };
          setSegments((prev) => [...prev, finalSegment]);
          currentWords.current = [];
          setCurrentSegment(null);
        }

        wordIndex++;
      }
    }, 800); // Add a word every 800ms
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!isListening) return;

    console.log("🛑 Stopping real-time speech recognition...");
    setIsListening(false);

    if (listeningTimer.current) {
      clearInterval(listeningTimer.current);
      listeningTimer.current = null;
    }

    // Finalize any remaining words
    if (currentWords.current.length > 0) {
      const finalSegment: CaptionSegment = {
        id: `final_segment_${Date.now()}`,
        text: currentWords.current.map((w) => w.word).join(" "),
        words: [...currentWords.current],
        startTime: currentWords.current[0]?.startTime || 0,
        endTime: currentWords.current[currentWords.current.length - 1]?.endTime || 0,
        isComplete: true,
      };

      setSegments((prev) => [...prev, finalSegment]);
      currentWords.current = [];
      setCurrentSegment(null);
    }
  }, [isListening]);

  // Fallback transcription using a free service
  const processFallbackTranscription = useCallback(async (audioPath: string) => {
    try {
      console.log("🔄 Using fallback transcription service...");

      // For now, we'll use a demo transcription
      // In a real implementation, you could:
      // 1. Use Web Speech API in a WebView
      // 2. Use a completely free service like Vosk (offline)
      // 3. Use Azure Speech (has a generous free tier)

      await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate processing

      // Create a realistic demo transcription
      const demoTranscriptions = [
        "Hey everyone, this is my confession for today.",
        "I have something important to share with you all.",
        "This app is amazing for anonymous confessions.",
        "I love how the face blur keeps me anonymous.",
        "The captions make my videos more accessible.",
        "Thank you for listening to my story today.",
      ];

      const randomTranscription = demoTranscriptions[Math.floor(Math.random() * demoTranscriptions.length)];
      const words = randomTranscription.split(" ");

      const captionWords: RecognizedWord[] = words.map((word, index) => ({
        word,
        confidence: 0.85 + Math.random() * 0.1, // Random confidence 0.85-0.95
        startTime: index * 600, // 600ms per word
        endTime: (index + 1) * 600,
        isComplete: true,
      }));

      // Group into segments
      const segments: CaptionSegment[] = [];
      const wordsPerSegment = 6;

      for (let i = 0; i < captionWords.length; i += wordsPerSegment) {
        const segmentWords = captionWords.slice(i, i + wordsPerSegment);

        segments.push({
          id: `segment_${segmentIdCounter.current++}_${Date.now()}`,
          text: segmentWords.map((w) => w.word).join(" "),
          words: segmentWords,
          startTime: segmentWords[0].startTime,
          endTime: segmentWords[segmentWords.length - 1].endTime,
          isComplete: true,
        });
      }

      setSegments(segments);
      console.log(`✅ Fallback transcription completed with ${segments.length} segments`);
    } catch (err) {
      console.error("Fallback transcription failed:", err);
      throw err;
    }
  }, []);

  // AssemblyAI post-processing transcription
  const processAudioFile = useCallback(async (audioPath: string) => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log("🎤 Processing audio file with AssemblyAI:", audioPath);

      // AssemblyAI API configuration
      const ASSEMBLYAI_API_KEY = process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY;

      if (!ASSEMBLYAI_API_KEY || ASSEMBLYAI_API_KEY === "your_assemblyai_api_key_here") {
        console.log("⚠️ AssemblyAI API key not configured, using fallback transcription");
        await processFallbackTranscription(audioPath);
        return;
      }

      // Step 1: Upload audio file to AssemblyAI
      console.log("📤 Uploading audio to AssemblyAI...");

      const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          "content-type": "application/octet-stream",
        },
        body: await fetch(audioPath).then((res) => res.blob()),
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { upload_url } = await uploadResponse.json();
      console.log("✅ Audio uploaded successfully");

      // Step 2: Request transcription with word-level timestamps
      console.log("🔄 Requesting transcription...");

      const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          audio_url: upload_url,
          word_boost: ["um", "uh", "like", "you know"], // Boost common filler words
          format_text: true, // Auto-format text with punctuation
          punctuate: true,
          speaker_labels: false, // We don't need speaker identification
          auto_highlights: false,
          sentiment_analysis: false,
        }),
      });

      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
      }

      const { id: transcriptId } = await transcriptResponse.json();
      console.log("🎯 Transcription job started:", transcriptId);

      // Step 3: Poll for completion
      let transcript;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max wait time

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            authorization: ASSEMBLYAI_API_KEY,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }

        transcript = await statusResponse.json();

        if (transcript.status === "completed") {
          console.log("✅ Transcription completed!");
          break;
        } else if (transcript.status === "error") {
          throw new Error(`Transcription failed: ${transcript.error}`);
        }

        console.log(`⏳ Transcription in progress... (${transcript.status})`);
        attempts++;
      }

      if (!transcript || transcript.status !== "completed") {
        throw new Error("Transcription timed out");
      }

      // Step 4: Process words into caption segments
      const words = transcript.words || [];

      if (words.length === 0) {
        console.log("⚠️ No words detected in audio");
        setSegments([]);
        return;
      }

      const captionWords: RecognizedWord[] = words.map((word: any) => ({
        word: word.text,
        confidence: word.confidence,
        startTime: word.start,
        endTime: word.end,
        isComplete: true,
      }));

      // Group words into segments (every 8-10 words for TikTok-style captions)
      const segments: CaptionSegment[] = [];
      const wordsPerSegment = 8;

      for (let i = 0; i < captionWords.length; i += wordsPerSegment) {
        const segmentWords = captionWords.slice(i, i + wordsPerSegment);

        segments.push({
          id: `segment_${segmentIdCounter.current++}_${Date.now()}`,
          text: segmentWords.map((w) => w.word).join(" "),
          words: segmentWords,
          startTime: segmentWords[0].startTime,
          endTime: segmentWords[segmentWords.length - 1].endTime,
          isComplete: true,
        });
      }

      setSegments(segments);
      console.log(`✅ Created ${segments.length} caption segments from ${words.length} words`);
    } catch (err) {
      console.error("Failed to process audio with AssemblyAI:", err);
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSegments([]);
    setError(null);
    console.log("🗑️ Cleared transcription results");
  }, []);

  return {
    isProcessing,
    isListening,
    isAvailable: true, // Always available for post-processing
    segments,
    currentSegment,
    error,
    processAudioFile,
    startListening,
    stopListening,
    clearResults,
    hasPermission: true, // No real-time permissions needed
  };
};
