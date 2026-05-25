import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

function getUserFromReq(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) throw new Error("No token");
  return verifyToken(token);
}

// GET — fetch all public rooms + rooms user is a member of
export async function GET(req) {
  try {
    const user = getUserFromReq(req);

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { isPrivate: false },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(rooms);
  } catch (err) {
    console.error("Get rooms error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — create a new room
export async function POST(req) {
  try {
    const user = getUserFromReq(req);
    const { name, isPrivate } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    // If room already exists (e.g. DM room), return existing one
    const existing = await prisma.room.findUnique({ where: { name } });
    if (existing) {
      // Make sure this user is a member
      await prisma.roomMember.upsert({
        where: {
          userId_roomId: { userId: user.id, roomId: existing.id },
        },
        update: {},
        create: { userId: user.id, roomId: existing.id },
      });
      return NextResponse.json(existing);
    }

    const room = await prisma.room.create({
      data: {
        name,
        isPrivate: isPrivate ?? false,
        members: {
          create: { userId: user.id },
        },
      },
    });

    return NextResponse.json(room);
  } catch (err) {
    console.error("Create room error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}