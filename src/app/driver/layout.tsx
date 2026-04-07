import { DriverChrome } from "@/components/driver/DriverChrome";
import { DriverPortalProvider } from "@/components/driver/DriverPortalProvider";
import { DriverViewportGate } from "./DriverViewportGate";

export default function DriverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DriverViewportGate>
      <DriverPortalProvider>
        <DriverChrome>{children}</DriverChrome>
      </DriverPortalProvider>
    </DriverViewportGate>
  );
}
