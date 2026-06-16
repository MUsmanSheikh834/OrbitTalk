"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { loadFromStorage } from "@/store/slices/authSlice";
import { setRooms } from "@/store/slices/roomSlice";
import { getSocket } from "@/lib/socket";
import { WebRTCProvider } from "@/context/WebRTCContext";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import CallManager from "@/components/CallManager";

export default function ChatPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(loadFromStorage());
  }, []);

  useEffect(() => {
    const t = token || sessionStorage.getItem("token");
    if (!t) router.push("/login");
  }, [token]);

  useEffect(() => {
    const t = token || sessionStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }

    const socket = getSocket(t);
    socket.auth = { token: t };
    if (!socket.connected) socket.connect();

    fetch("/api/rooms", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((rooms) => {
        if (Array.isArray(rooms)) dispatch(setRooms(rooms));
      })
      .catch(console.error);

    return () => {
      socket.off();
    };
  }, [token]);

  return (
    // WebRTCProvider must wrap both ChatWindow (initiateCall) and CallManager (refs/UI)
    <WebRTCProvider>
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
        <Sidebar />
        <ChatWindow />
        <CallManager />
      </div>
    </WebRTCProvider>
  );
}
