"use client";
import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "@/lib/socket";

export default function VoiceRecorder({ roomId }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const { token } = useSelector((s) => s.auth);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await uploadAndSend(blob);
    };

    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function uploadAndSend(blob) {
    setUploading(true);
    const t = token || sessionStorage.getItem("token");

    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: formData,
      });
      const { url } = await res.json();

      const socket = getSocket(t);
      socket.emit("send_message", {
        roomId,
        content: "",
        type: "audio",
        fileUrl: url,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      disabled={uploading}
      className={`p-2 rounded-xl transition ${
        recording ? "bg-red-600 animate-pulse" : "bg-gray-600 hover:bg-gray-500"
      } disabled:opacity-40`}
      title="Hold to record"
    >
      🎤
    </button>
  );
}
