import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== "production";


const app = next({ dev });
const handle = app.getRequestHandler();


app.prepare().then(() => {
  console.log("4. Next.js ready!");

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.user.username} (${socket.id})`);

    socket.on("join_room", async (roomId) => {
      try {
        await prisma.roomMember.upsert({
          where: { userId_roomId: { userId: socket.user.id, roomId } },
          update: {},
          create: { userId: socket.user.id, roomId },
        });
        socket.join(roomId);
        console.log(`[Socket] ${socket.user.username} joined room ${roomId}`);
      } catch (err) {
        console.error("[Socket] join_room error:", err.message);
        socket.emit("error", { message: "Could not join room" });
      }
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
    });

    socket.on("send_message", async ({ roomId, content }) => {
      if (!roomId || !content?.trim()) return;
      try {
        const membership = await prisma.roomMember.findUnique({
          where: { userId_roomId: { userId: socket.user.id, roomId } },
        });
        if (!membership) {
          socket.emit("error", { message: "You are not a member of this room" });
          return;
        }
        const message = await prisma.message.create({
          data: { content: content.trim(), roomId, senderId: socket.user.id },
          include: { sender: { select: { id: true, username: true } } },
        });
        io.to(roomId).emit("new_message", message);
      } catch (err) {
        console.error("[Socket] send_message error:", err.message);
        socket.emit("error", { message: "Could not send message" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user.username} — ${reason}`);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("app.prepare() failed:", err);
  process.exit(1);
});