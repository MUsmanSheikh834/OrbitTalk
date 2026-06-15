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
        OR: [{ isPrivate: false }, { members: { some: { userId: user.id } } }],
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
        { status: 400 },
      );
    }
    if (isPrivate) {
      const targetUser = await prisma.user.findUnique({
        where: { email: name },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if DM room already exists
      const dmName = [user.username, targetUser.username].sort().join("_"); // consistent name regardless of who initiates
      const existing = await prisma.room.findUnique({
        where: { name: dmName },
      });
      if (existing) {
        return NextResponse.json(existing);
      }

      // Create the DM room and add both users
      const room = await prisma.room.create({
        data: {
          name: dmName,
          isPrivate: true,
          members: {
            create: [{ userId: user.id }, { userId: targetUser.id }],
          },
        },
      });

      return NextResponse.json(room);
    } else {
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
    }
  } catch (err) {
    console.error("Create room error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — delete a room (only if user is a member)
export async function DELETE(req) {
  try {
    const user = getUserFromReq(req);
    const { roomId, userId } = await req.json();

    const targetUser = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true }, // ← needed for members.length check
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.isPrivate && room.members.length > 1) {
      // Just remove this one member, keep the room alive
      await prisma.roomMember.delete({
        where: { userId_roomId: { userId, roomId } },
      });
    } else {
      // Delete everything — messages first, then members, then room
      await prisma.message.deleteMany({ where: { roomId } });
      await prisma.roomMember.deleteMany({ where: { roomId } });
      await prisma.room.delete({ where: { id: roomId } });
    }

    return NextResponse.json({ success: true }, { status: 200 }); // ← missing before
  } catch (err) {
    console.error("Delete room error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}