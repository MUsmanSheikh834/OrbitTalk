"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { loadFromStorage } from "@/store/slices/authSlice";
import { setRooms } from "@/store/slices/roomSlice";
import { getSocket } from "@/lib/socket";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token } = useSelector((s) => s.auth);

  // Load token from sessionStorage on first render
  useEffect(() => {
    dispatch(loadFromStorage());
  }, []);

  // Redirect to login if no token
  useEffect(() => {
    const t = token || sessionStorage.getItem("token");
    if (!t) {
      router.push("/login");
    }
  }, [token]);

  // Connect socket and fetch rooms
  useEffect(() => {
    const t = token || sessionStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }

    const socket = getSocket(t);
    socket.auth = { token: t }; // ensure token is fresh

    if (!socket.connected) {
      socket.connect();
    }

    fetch("/api/rooms", {
      headers: { Authorization: `Bearer ${t}` },
    })
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
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}