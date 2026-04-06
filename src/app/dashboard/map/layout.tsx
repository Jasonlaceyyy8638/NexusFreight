export default function DashboardMapLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#1A1C1E]">
      {children}
    </div>
  );
}
