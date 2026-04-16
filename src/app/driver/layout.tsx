import { DriverChrome } from "@/components/driver/DriverChrome";
import { DriverPasswordGate } from "@/components/driver/DriverPasswordGate";
import { DriverPortalProvider } from "@/components/driver/DriverPortalProvider";
import { DriverViewportGate } from "./DriverViewportGate";

export default function DriverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DriverViewportGate>
      <DriverPasswordGate>
        <DriverPortalProvider>
          <DriverChrome>{children}</DriverChrome>
        </DriverPortalProvider>
      </DriverPasswordGate>
    </DriverViewportGate>
  );
}
