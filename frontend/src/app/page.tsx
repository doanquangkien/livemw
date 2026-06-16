import { LivePlayer } from "./components/LivePlayer";

const HLS_URL = process.env.NEXT_PUBLIC_HLS_URL ?? "";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-wide">
            LiveMecwish
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-red-500" />
            </span>
            LIVE
          </span>
        </header>

        <LivePlayer hlsUrl={HLS_URL} />

        <footer className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <span>
            HLS: {HLS_URL ? new URL(HLS_URL).pathname : "not configured"}
          </span>
          <span>Powered by HLS.js</span>
        </footer>
      </div>
    </main>
  );
}
