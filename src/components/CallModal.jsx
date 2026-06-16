"use client";
import { useRef } from "react";
import { useSelector } from "react-redux";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function CallModal() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { status, callType, roomId } = useSelector((s) => s.call);
  const { hangUp } = useWebRTC({ localVideoRef, remoteVideoRef });

  if (status !== "active") return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4">
      <p className="text-white text-sm uppercase tracking-widest opacity-60">
        {callType === "video" ? "Video Call" : "Voice Call"} — Active
      </p>

      <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-2xl overflow-hidden">
        {/* Remote video (large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local video (picture-in-picture) */}
        {callType === "video" && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-3 right-3 w-32 aspect-video rounded-xl border-2 border-gray-600 object-cover"
          />
        )}

        {/* Audio-only: just play remote audio */}
        {callType === "audio" && (
          <audio ref={remoteVideoRef} autoPlay className="hidden" />
        )}
      </div>

      <button
        onClick={() => hangUp(roomId)}
        className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-semibold transition"
      >
        End Call
      </button>
    </div>
  );
}
