import { NextRequest, NextResponse } from "next/server";
import { getRules, createRule, updateRule } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "ANALYST"]);
  if (!auth.authorized) return auth.response;

  try {
    const rules = getRules();
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();

    const rule = {
      id: generateId(),
      code: body.code,
      name: body.name,
      description: body.description,
      severityDefault: body.severityDefault,
      isActive: body.isActive !== false,
      evaluatorType: body.evaluatorType,
      config: body.config || {},
    };

    createRule(rule);

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}
