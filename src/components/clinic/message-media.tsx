import { FileText, Download } from "lucide-react";
import type { MediaType } from "@/lib/types";

export function MessageMedia({
  mediaUrl,
  mediaType,
  mediaFilename,
}: {
  mediaUrl: string;
  mediaType: MediaType;
  mediaFilename: string | null;
}) {
  if (mediaType === "image") {
    return (
      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not an optimizable local asset */}
        <img
          src={mediaUrl}
          alt={mediaFilename ?? "Image"}
          className="max-h-72 w-full rounded-md object-cover"
        />
      </a>
    );
  }

  if (mediaType === "video") {
    return <video src={mediaUrl} controls className="max-h-72 w-full rounded-md" />;
  }

  if (mediaType === "audio") {
    return <audio src={mediaUrl} controls className="w-full" />;
  }

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md bg-black/5 px-3 py-2 hover:bg-black/10"
    >
      <FileText className="size-6 shrink-0 text-[#111B21]" />
      <span className="min-w-0 flex-1 truncate text-sm text-[#111B21]">
        {mediaFilename ?? "Document"}
      </span>
      <Download className="size-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
