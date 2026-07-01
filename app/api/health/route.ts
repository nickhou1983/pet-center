import { NextResponse } from "next/server";

// API routes run on the Node.js runtime. Later modules depend on
// transformers.js (CLIP) for vector generation, which is not compatible with
// the Edge runtime, so we standardize on Node here from the start.
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "pet-center",
    timestamp: new Date().toISOString(),
  });
}
