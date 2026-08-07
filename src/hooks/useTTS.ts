import { useEffect, useRef, useState, useCallback } from "react";

export function useTTS() {
  const [supported, setSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState(1);

  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);

  // Load voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        // Default to a good system voice or first available
        if (!selectedVoice) {
          const defaultVoice =
            v.find((voice) => voice.name.includes("Microsoft David")) ||
            v.find((voice) => voice.name.includes("Google") || voice.name.includes("Siri")) ||
            v.find((voice) => voice.lang.startsWith("en-")) ||
            v[0];
          setSelectedVoice(defaultVoice?.name ?? "");
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const updateProgress = (idx: number, total: number) => {
    setProgress(total > 0 ? idx / total : 0);
  };

  const playChunk = useCallback(
    (idx: number) => {
      if (!supported) return;
      window.speechSynthesis.cancel(); // Stop current

      const chunks = chunksRef.current;
      if (idx >= chunks.length || idx < 0) {
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }

      indexRef.current = idx;
      const text = chunks[idx] ?? "";
      if (!text.trim()) {
        // Skip empty chunks
        playChunk(idx + 1);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      if (selectedVoice) {
        const v = voices.find((voice) => voice.name === selectedVoice);
        if (v) utterance.voice = v;
      }

      utterance.onend = () => {
        // Automatically play next chunk when finished
        updateProgress(idx + 1, chunks.length);
        playChunk(idx + 1);
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.error("TTS Error:", e);
          setIsPlaying(false);
        }
      };

      updateProgress(idx, chunks.length);
      setIsPlaying(true);
      setIsPaused(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported, rate, selectedVoice, voices]
  );

  const start = useCallback(
    (chunks: string[], startIndex = 0) => {
      chunksRef.current = chunks;
      playChunk(startIndex);
    },
    [playChunk]
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  }, [supported]);

  const next = useCallback(() => {
    if (!isPlaying) return;
    playChunk(indexRef.current + 1);
  }, [isPlaying, playChunk]);

  const prev = useCallback(() => {
    if (!isPlaying) return;
    playChunk(Math.max(0, indexRef.current - 1));
  }, [isPlaying, playChunk]);

  // Handle speed change mid-playback
  useEffect(() => {
    if (isPlaying && !isPaused) {
      playChunk(indexRef.current);
    }
  }, [rate, playChunk]); // Re-trigger on rate change

  return {
    supported,
    isPlaying,
    isPaused,
    progress,
    voices,
    selectedVoice,
    rate,
    setRate,
    setSelectedVoice,
    start,
    pause,
    resume,
    stop,
    next,
    prev,
  };
}
