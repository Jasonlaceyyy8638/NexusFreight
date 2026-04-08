import type { Metadata } from "next";
import { ProvisioningClient } from "./ProvisioningClient";

export const metadata: Metadata = {
  title: "Setting up workspace | NexusFreight",
  description: "Your workspace is being prepared after checkout.",
};

export default function ProvisioningPage() {
  return <ProvisioningClient />;
}
