import { NextRequest, NextResponse } from "next/server";
import { getRules, createRule, updateRule } from "@/lib/db";
import { generateId } from "@/lib/utils";

export async function GET() {
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
