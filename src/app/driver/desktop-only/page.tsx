export default function DriverDesktopOnlyPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0D0E10] px-6 text-center">
      <p className="max-w-md text-lg font-medium leading-relaxed text-white">
        The Driver Portal is only available on mobile devices.
      </p>
      <p className="mt-4 max-w-sm text-sm text-slate-400">
        Open NexusFreight on your phone or resize this window to a narrow width
        to continue.
      </p>
    </div>
  );
}
