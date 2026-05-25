"use client";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMessages, addMessage } from "@/store/slices/chatSlice";
import { getSocket } from "@/lib/socket";
import MessageInput from "./MessageInput";

export default function ChatWindow() {
  const dispatch = useDispatch();
  const { activeRoom } = useSelector((s) => s.rooms);
  const { token, user } = useSelector((s) => s.auth);
  const messagesByRoom = useSelector((s) => s.chat.messagesByRoom);
  const messages = messagesByRoom[activeRoom?.id] || [];
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!activeRoom) return;

    const t = token || sessionStorage.getItem("token");
    if (!t) return;
    const socket = getSocket(t);

    // Join the room via socket
    socket.emit("join_room", activeRoom.id);

    // Fetch message history from DB
    fetch(`/api/messages/${activeRoom.id}`, {
  headers: { Authorization: `Bearer ${t}` },
})
  .then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then((msgs) => {
    if (Array.isArray(msgs)) {
      dispatch(setMessages({ roomId: activeRoom.id, messages: msgs }));
    }
  })
  .catch((err) => console.error("Fetch messages error:", err));

    // Listen for new incoming messages
    socket.on("new_message", (message) => {
      dispatch(addMessage({ roomId: message.roomId, message }));
    });

    return () => {
      socket.emit("leave_room", activeRoom.id);
      socket.off("new_message");
    };
  }, [activeRoom?.id]);

  // Auto scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
        <p className="text-4xl">💬</p>
        <p className="text-lg">Select a room to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
        <span className="text-gray-400">#</span>
        <h2 className="font-semibold text-lg">{activeRoom.name}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender?.id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <span className="text-xs text-gray-400 mb-1 px-1">
                {msg.sender?.username}
              </span>
              <div
                className={`px-4 py-2 rounded-2xl max-w-sm text-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-gray-700 text-gray-100 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-xs text-gray-600 mt-1 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput roomId={activeRoom.id} />
    </div>
  );
}