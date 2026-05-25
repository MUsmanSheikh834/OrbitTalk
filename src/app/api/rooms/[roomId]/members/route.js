import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// POST — join a room
export async function POST(req, { params }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    const user = verifyToken(token);

    await prisma.roomMember.upsert({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: params.roomId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roomId: params.roomId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Join room error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}