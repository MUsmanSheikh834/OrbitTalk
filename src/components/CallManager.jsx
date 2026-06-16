"use client";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { endCall } from "@/store/slices/callSlice";
import { useWebRTC } from "@/context/WebRTCContext";

export default function CallManager() {
  const dispatch = useDispatch();
  const { status, callType, roomId, callerName, offer } = useSelector(
    (s) => s.call,
  );

  const {
    answerCall,
    hangUp,
    attachPendingStreams,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
  } = useWebRTC();

  // Once this component mounts (modal appears), flush any stream that arrived
  // before the <video>/<audio> elements existed in the DOM
  useEffect(() => {
    if (status === "calling" || status === "active") {
      attachPendingStreams();
    }
  }, [status]);

  // ── Incoming banner ──────────────────────────────────────────
  if (status === "incoming") {
    return (
      <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-600 rounded-2xl p-4 shadow-2xl w-72 flex flex-col gap-3">
        <div>
          <p className="text-white font-semibold">{callerName}</p>
          <p className="text-gray-400 text-sm">
            Incoming {callType === "video" ? "Video" : "Voice"} Call…
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => answerCall(roomId, offer, callType)}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-white font-semibold transition"
          >
            ✅ Accept
          </button>
          <button
            onClick={() => dispatch(endCall())}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold transition"
          >
            ❌ Decline
          </button>
        </div>
      </div>
    );
  }

  // ── Active / ringing modal ───────────────────────────────────
  if (status === "calling" || status === "active") {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-sm uppercase tracking-widest opacity-60">
          {status === "calling"
            ? "Calling…"
            : callType === "video"
              ? "Video Call"
              : "Voice Call"}
        </p>

        {callType === "video" ? (
          // ── Video call layout ──────────────────────────────
          <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-2xl overflow-hidden">
            {/* Remote video — large */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local video — picture-in-picture, muted to prevent echo */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-3 right-3 w-32 aspect-video rounded-xl border-2 border-gray-600 object-cover bg-gray-800"
            />
            {/* Remote audio is carried by the video track; no separate <audio> needed */}
          </div>
        ) : (
          // ── Audio call layout ──────────────────────────────
          <div className="flex flex-col items-center gap-4">
            {/* Hidden audio element for remote stream — NOT remoteVideoRef */}
            <audio ref={remoteAudioRef} autoPlay />
            <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl">
              👤
            </div>
            <p className="text-white text-lg">
              {status === "calling" ? "Ringing…" : "Connected"}
            </p>
          </div>
        )}

        <button
          onClick={() => hangUp(roomId)}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-semibold transition"
        >
          End Call
        </button>
      </div>
    );
  }

  return null;
}
