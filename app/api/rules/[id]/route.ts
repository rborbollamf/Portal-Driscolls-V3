import { NextRequest, NextResponse } from "next/server";
import { updateRule, deleteRule } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const updatedRule = updateRule(params.id, body);

    if (!updatedRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedRule);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  try {
    const deleted = deleteRule(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}
