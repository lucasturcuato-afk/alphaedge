// src/app/api/props/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MOCK_PROPS } from "@/lib/mock-data/props";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");
  const propType = searchParams.get("propType");
  const minEdge = Number(searchParams.get("minEdge") ?? 0);
  const minConf = Number(searchParams.get("minConf") ?? 0);
  const sortBy = searchParams.get("sortBy") ?? "edge";

  let props = MOCK_PROPS;

  if (sport && sport !== "ALL") {
    props = props.filter((p) => p.player.sport === sport);
  }
  if (propType && propType !== "ALL") {
    props = props.filter((p) => p.propType === propType);
  }
  if (minEdge > 0) {
    props = props.filter((p) => p.edge >= minEdge);
  }
  if (minConf > 0) {
    props = props.filter((p) => p.confidenceScore >= minConf);
  }

  props = props.sort((a, b) => {
    if (sortBy === "edge") return b.edge - a.edge;
    if (sortBy === "confidence") return b.confidenceScore - a.confidenceScore;
    return 0;
  });

  return NextResponse.json({
    props,
    total: props.length,
    meta: {
      dataSource: "mock",
      modelVersion: "v2.1",
      timestamp: new Date().toISOString(),
    },
  });
}
