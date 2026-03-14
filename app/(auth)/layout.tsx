export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          {children}
        </div>
      </div>
    </div>
  );
}
