import { io } from "socket.io-client";

let socket = null;

export function getSocket(token) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_APP_URL, {
      auth: { token },
      autoConnect: false, // don't connect until we explicitly call connect()
    });
  }

  // Update token in case it wasn't available on first call
  if (token) {
    socket.auth = { token };
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}