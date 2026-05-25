"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { setActiveRoom, addRoom } from "@/store/slices/roomSlice";
import { logout } from "@/store/slices/authSlice";
import { disconnectSocket } from "@/lib/socket";

export default function Sidebar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { rooms, activeRoom } = useSelector((s) => s.rooms);
  const { token, user } = useSelector((s) => s.auth);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  async function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;

    setCreating(true);
    const t = token || sessionStorage.getItem("token");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ name }),
      });

      const room = await res.json();

      // Only add if not already in the list
      const exists = rooms.find((r) => r.id === room.id);
      if (!exists) dispatch(addRoom(room));

      dispatch(setActiveRoom(room));
      setNewRoomName("");
    } catch (err) {
      console.error("Create room error:", err);
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
  disconnectSocket();
  dispatch(logout());
  // Clear cookie
  document.cookie = "token=; path=/; max-age=0";
  router.push("/login");
}

  // Separate public rooms and DM rooms
  const publicRooms = rooms.filter((r) => !r.isPrivate);
  const dmRooms = rooms.filter((r) => r.isPrivate);

  return (
    <div className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">

      {/* User info */}
      <div className="p-4 border-b border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
          Logged in as
        </p>
        <p className="font-semibold text-white">{user?.username}</p>
      </div>

      {/* Create room input */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
          New Room
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            placeholder="room-name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createRoom()}
          />
          <button
            onClick={createRoom}
            disabled={creating || !newRoomName.trim()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg text-sm font-bold transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto py-2">

        {/* Public rooms */}
        {publicRooms.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider px-4 py-1">
              Rooms
            </p>
            {publicRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => dispatch(setActiveRoom(room))}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-700 transition ${
                  activeRoom?.id === room.id
                    ? "bg-gray-700 border-l-4 border-indigo-500"
                    : "border-l-4 border-transparent"
                }`}
              >
                <span className="text-gray-400 text-sm">#</span>
                <span className="text-sm text-gray-200">{room.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* DM rooms */}
        {dmRooms.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider px-4 py-1">
              Direct Messages
            </p>
            {dmRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => dispatch(setActiveRoom(room))}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-700 transition ${
                  activeRoom?.id === room.id
                    ? "bg-gray-700 border-l-4 border-indigo-500"
                    : "border-l-4 border-transparent"
                }`}
              >
                <span className="text-gray-400 text-sm">@</span>
                <span className="text-sm text-gray-200">{room.name}</span>
              </button>
            ))}
          </div>
        )}

        {rooms.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-4 px-4">
            No rooms yet. Create one above!
          </p>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="p-4 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 border-t border-gray-700 text-left transition"
      >
        Logout
      </button>
    </div>
  );
}