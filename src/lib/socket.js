import { io } from "socket.io-client";

let socket = null;

export function getSocket(token) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_APP_URL, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}