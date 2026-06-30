export default function CustomizeLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme border-t-[var(--accent)]" />
      <p className="mt-4 text-sm text-muted">بارگذاری استودیو...</p>
    </div>
  );
}
