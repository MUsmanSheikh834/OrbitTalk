import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function GET(req, { params }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    verifyToken(token);

    const messages = await prisma.message.findMany({
      where: { roomId: params.roomId },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        sender: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}