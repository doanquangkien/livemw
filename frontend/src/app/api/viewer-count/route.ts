import { NextResponse } from "next/server";

interface ViewerCountResponse {
  streamKey: string | null;
  nclients: number;
  bytesIn: number;
  bytesOut: number;
  uptimeMs: number | null;
  error?: string;
}

async function fetchNginxStat(): Promise<string> {
  const res = await fetch("http://nginx-rtmp:8088/stat", {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Nginx stat returned ${res.status}`);
  return res.text();
}

function parseNclients(xml: string): {
  nclients: number;
  streamKey: string | null;
  bytesIn: number;
  bytesOut: number;
  uptimeMs: number | null;
} {
  const result = {
    nclients: 0,
    streamKey: null as string | null,
    bytesIn: 0,
    bytesOut: 0,
    uptimeMs: null as number | null,
  };

  const streamMatch = xml.match(/<stream>([\s\S]*?)<\/stream>/);
  if (!streamMatch) return result;

  const streamBlock = streamMatch[1];

  const nameMatch = streamBlock.match(/<name>([^<]+)<\/name>/);
  if (nameMatch) result.streamKey = nameMatch[1];

  const clientsMatch = streamBlock.match(/<nclients>(\d+)<\/nclients>/);
  if (clientsMatch) result.nclients = parseInt(clientsMatch[1], 10);

  const bytesInMatch = streamBlock.match(/<bytes_in>(\d+)<\/bytes_in>/);
  if (bytesInMatch) result.bytesIn = parseInt(bytesInMatch[1], 10);

  const bytesOutMatch = streamBlock.match(/<bytes_out>(\d+)<\/bytes_out>/);
  if (bytesOutMatch) result.bytesOut = parseInt(bytesOutMatch[1], 10);

  const uptimeMatch = streamBlock.match(/<time>(\d+)<\/time>/);
  if (uptimeMatch) result.uptimeMs = parseInt(uptimeMatch[1], 10);

  return result;
}

export async function GET(): Promise<NextResponse<ViewerCountResponse>> {
  try {
    const xml = await fetchNginxStat();
    const stats = parseNclients(xml);
    return NextResponse.json(
      {
        streamKey: stats.streamKey,
        nclients: stats.nclients,
        bytesIn: stats.bytesIn,
        bytesOut: stats.bytesOut,
        uptimeMs: stats.uptimeMs,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        streamKey: null,
        nclients: 0,
        bytesIn: 0,
        bytesOut: 0,
        uptimeMs: null,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
