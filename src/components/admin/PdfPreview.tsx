export function PdfPreview({ url, height = 600 }: { url: string | null; height?: number }) {
  if (!url) {
    return (
      <div
        className="border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-[12px] text-neutral-500"
        style={{ height }}
      >
        No PDF available.
      </div>
    );
  }
  return (
    <iframe
      src={url}
      title="Document preview"
      className="w-full border border-neutral-300 bg-neutral-100"
      style={{ height }}
    />
  );
}
