import type { DebugData } from "@/lib/chat-types";

export function DebugPanel({ data }: { data: DebugData }) {
  return (
    <details className="mt-2 max-w-[85%] rounded-lg border border-tg-border bg-tg-pale-pink/40 text-xs">
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-tg-purple">
        Pipeline debug — Stage 1 JSON &amp; retrieved places
      </summary>
      <div className="space-y-3 px-3 pb-3">
        <div>
          <div className="mb-1 font-semibold text-tg-purple">Stage 1 output</div>
          <pre className="overflow-x-auto rounded bg-white/70 p-2 font-mono">
            {JSON.stringify(data.stage1Json, null, 2)}
          </pre>
        </div>
        <div>
          <div className="mb-1 font-semibold text-tg-purple">
            Retrieved places ({data.retrieved.length})
          </div>
          {data.retrieved.length === 0 ? (
            <p className="text-zinc-500">No matching records found.</p>
          ) : (
            <ul className="space-y-1">
              {data.retrieved.map((place) => (
                <li key={place.id} className="rounded bg-white/70 p-2">
                  <span className="font-semibold">{place.name}</span>{" "}
                  <span className="text-zinc-500">
                    ({place.city}, {place.country}) — {place.locationType}, rating {place.rating}
                  </span>
                  {place.links.website && (
                    <>
                      {" "}
                      —{" "}
                      <a
                        href={place.links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tg-pink underline"
                      >
                        website
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </details>
  );
}
