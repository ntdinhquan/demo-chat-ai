import type { PlaceRecord } from "@/lib/retrieval";

export function PlaceThumbnails({ places }: { places: PlaceRecord[] }) {
  const withPhotos = places.filter((place) => place.photos.length > 0);
  if (withPhotos.length === 0) return null;

  return (
    <div className="mt-2 flex max-w-[85%] gap-3 overflow-x-auto pb-1">
      {withPhotos.map((place) => (
        <a
          key={place.id}
          href={place.links.website ?? place.photos[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="w-32 shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external placeholder photos, not worth configuring next/image remote patterns for a demo */}
          <img
            src={place.photos[0]}
            alt={place.name}
            className="h-24 w-32 rounded-lg object-cover"
          />
          <p className="mt-1 truncate text-xs text-zinc-600">{place.name}</p>
        </a>
      ))}
    </div>
  );
}