import { useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "@/lib/socket";
import { startCall, callAccepted, endCall } from "@/store/slices/callSlice";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({ localVideoRef, remoteVideoRef }) {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);
  const pcRef = useRef(null); // RTCPeerConnection

  // Attach stream to a video element ref
  function attachStream(ref, stream) {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }

  function createPeerConnection(roomId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket(token);

    // Send ICE candidates to the other peer via socket
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("ice_candidate", { roomId, candidate });
      }
    };

    // When we receive remote tracks, attach to remote video/audio
    pc.ontrack = ({ streams }) => {
      attachStream(remoteVideoRef, streams[0]);
    };

    pcRef.current = pc;
    return pc;
  }

  // ── CALLER side ──────────────────────────────────────────────
  const initiateCall = useCallback(
    async (roomId, callType = "video") => {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      attachStream(localVideoRef, stream);

      const pc = createPeerConnection(roomId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket(token);
      socket.emit("call_user", { roomId, offer, callType });
      dispatch(startCall({ callType, roomId }));

      // Listen for answer
      socket.once("call_answered", async ({ answer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        dispatch(callAccepted());
      });

      // Listen for remote ICE candidates
      socket.on("ice_candidate", async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      });

      socket.once("call_ended", () => hangUp(roomId));
    },
    [token],
  );

  // ── CALLEE side ──────────────────────────────────────────────
  const answerCall = useCallback(
    async (roomId, offer, callType) => {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      attachStream(localVideoRef, stream);

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
        } catch (e) {}
      });

      socket.once("call_ended", () => hangUp(roomId));
    },
    [token],
  );

  // ── HANG UP ──────────────────────────────────────────────────
  const hangUp = useCallback(
    (roomId) => {
      const socket = getSocket(token);

      // Stop all local tracks
      const localStream = localVideoRef.current?.srcObject;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }

      // Close peer connection
      pcRef.current?.close();
      pcRef.current = null;

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      socket.emit("end_call", { roomId });
      socket.off("ice_candidate");
      socket.off("call_ended");

      dispatch(endCall());
    },
    [token],
  );

  return { initiateCall, answerCall, hangUp };
}
