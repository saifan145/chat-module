import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Trash2, Send, Play, Pause } from "lucide-react";

interface VoiceRecorderProps {
  onSendVoiceNote: (audioUrl: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    async function startMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start();
        }
      } catch {
        // Fallback for mock preview if microphone permission is denied or running in headless
      }
    }

    startMedia();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleStopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      setAudioUrl("mock-voice-note.webm");
    }
  };

  const handleSend = () => {
    onSendVoiceNote(audioUrl || "mock-voice-note.webm", Math.max(seconds, 1));
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-slate-700 animate-in fade-in">
      <div className="flex items-center space-x-3">
        {isRecording ? (
          <>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white animate-pulse">
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400">
                REC {formatTimer(seconds)}
              </span>
              <div className="flex items-center space-x-1 h-4">
                <span className="w-1 h-3 bg-red-500 rounded-full animate-bounce" />
                <span className="w-1 h-4 bg-red-500 rounded-full animate-bounce delay-100" />
                <span className="w-1 h-2 bg-red-500 rounded-full animate-bounce delay-200" />
                <span className="w-1 h-4 bg-red-500 rounded-full animate-bounce delay-300" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
              Voice Note ({formatTimer(seconds)})
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors"
          >
            <Square className="w-3 h-3" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3 h-3" />
            <span>Attach & Send</span>
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          title="Discard"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {audioUrl && !audioUrl.startsWith("mock") && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
};
