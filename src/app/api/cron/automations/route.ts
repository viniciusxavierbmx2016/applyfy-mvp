import { NextResponse } from "next/server";
import { runAllBehavioralAutomations } from "@/lib/automation-cron";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllBehavioralAutomations();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron automations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
