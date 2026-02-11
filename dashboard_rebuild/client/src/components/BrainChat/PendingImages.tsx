import { X } from "lucide-react";

interface PendingImagesProps {
  images: string[];
  onRemove: (index: number) => void;
}

export function PendingImages({ images, onRemove }: PendingImagesProps) {
  if (images.length === 0) return null;

  return (
    <div className="px-4 py-1 flex gap-2 flex-wrap shrink-0">
      {images.map((img, i) => (
        <div key={i} className="relative">
          <img
            src={img}
            alt="pending"
            className="h-12 rounded-none border border-primary/30"
          />
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1 -right-1 bg-destructive rounded-none p-0.5"
            aria-label="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
