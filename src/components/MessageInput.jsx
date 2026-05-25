"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "@/lib/socket";

export default function MessageInput({ roomId }) {
  const [text, setText] = useState("");
  const { token } = useSelector((s) => s.auth);

  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const t = token || sessionStorage.getItem("token");
    const socket = getSocket(t);
    socket.emit("send_message", { roomId, content: trimmed });
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="px-6 py-4 border-t border-gray-700 flex gap-3 items-center">
      <input
        className="flex-1 px-4 py-2 bg-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400"
        placeholder="Type a message and press Enter..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={sendMessage}
        disabled={!text.trim()}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition text-white"
      >
        Send
      </button>
    </div>
  );
}