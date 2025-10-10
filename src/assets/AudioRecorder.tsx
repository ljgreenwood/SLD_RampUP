import { useState, useEffect, useRef } from "react";
import "../App.css";

function AudioRecorder({ setFiles }: { setFiles: (files: any) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code !== "Space" || isRecording) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) =>
          chunksRef.current.push(event.data);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access error:", err);
        alert("Microphone access denied or unsupported.");
      }
    };

    const handleKeyUp = () => {
      if (!isRecording || !mediaRecorderRef.current) return;
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        setFiles((prev: any) => [...prev, { file }]);
      };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecording, setFiles]);

  return (
    <div style={{ textAlign: "center" }}>
      <button disabled style={{ opacity: 0.7 }}>
        Hold Spacebar to Talk
      </button>
      <div style={{ marginTop: "0.5rem" }}>
        {isRecording ? "🎙️ Recording..." : "Press and hold spacebar to record"}
      </div>
    </div>
  );
}

export default AudioRecorder;
