"use client";
import { useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { endCall } from "@/store/slices/callSlice";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function IncomingCallBanner() {
  const dispatch = useDispatch();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { status, callerName, roomId, offer, callType } = useSelector(
    (s) => s.call,
  );
  const { answerCall } = useWebRTC({ localVideoRef, remoteVideoRef });

  if (status !== "incoming") return null;

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
