"use client";
import { createContext, useContext, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "@/lib/socket";
import { startCall, callAccepted, endCall } from "@/store/slices/callSlice";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const WebRTCContext = createContext(null);

export function WebRTCProvider({ children }) {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);

  const localVideoRef = useRef(null); // <video muted> — local preview
  const remoteVideoRef = useRef(null); // <video> — remote video track
  const remoteAudioRef = useRef(null); // <audio> — remote audio (audio-only calls)
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingRemoteStreamRef = useRef(null); // holds stream if refs not mounted yet

  // Called by CallManager after its elements mount so we can flush pending stream
  function attachPendingStreams() {
    if (pendingRemoteStreamRef.current) {
      _attachRemoteStream(pendingRemoteStreamRef.current);
      pendingRemoteStreamRef.current = null;
    }
    if (localStreamRef.current) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }

  function _attachRemoteStream(stream) {
    // Try video element first (video calls), fall back to audio element
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    } else if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
    } else {
      // Elements not mounted yet — store for when CallManager mounts
      pendingRemoteStreamRef.current = stream;
    }
  }

  function createPeerConnection(roomId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket(token);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("ice_candidate", { roomId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (streams?.[0]) _attachRemoteStream(streams[0]);
    };

    pcRef.current = pc;
    return pc;
  }

  // Fixed audio constraints to prevent distortion/echo
  const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  };

  async function initiateCall(roomId, callType = "video") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video:
        callType === "video"
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
    });

    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection(roomId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const socket = getSocket(token);
    socket.emit("call_user", { roomId, offer, callType });
    dispatch(startCall({ callType, roomId }));

    socket.once("call_answered", async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      dispatch(callAccepted());
    });

    socket.on("ice_candidate", async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    });

    socket.once("call_ended", () => hangUp(roomId));
  }

  async function answerCall(roomId, offer, callType) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video:
        callType === "video"
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
    });

    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection(roomId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const socket = getSocket(token);
    socket.emit("call_answered", { roomId, answer });
    dispatch(callAccepted());

    socket.on("ice_candidate", async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    });

    socket.once("call_ended", () => hangUp(roomId));
  }

  function hangUp(roomId) {
    const socket = getSocket(token);

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingRemoteStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    socket.emit("end_call", { roomId });
    socket.off("ice_candidate");
    socket.off("call_ended");

    dispatch(endCall());
  }

  return (
    <WebRTCContext.Provider
      value={{
        initiateCall,
        answerCall,
        hangUp,
        attachPendingStreams,
        localVideoRef,
        remoteVideoRef,
        remoteAudioRef,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTC() {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error("useWebRTC must be used inside WebRTCProvider");
  return ctx;
}
