import { NextRequest, NextResponse } from "next/server";
import { worldManager } from "@/core/worlds";
import { isValidAdminSession } from "@/core/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isValidAdminSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await worldManager.loadWorld(id);

    if (result.success) {
      return NextResponse.json({ world: result.world });
    } else {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
  } catch (error) {
    console.error("Error loading world:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isValidAdminSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await params;
    const worldData = await request.json();

    const result = await worldManager.saveWorld(worldData);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error saving world:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isValidAdminSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await worldManager.deleteWorld(id);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error deleting world:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
