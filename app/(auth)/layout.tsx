export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-16">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

