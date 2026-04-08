import { notFound } from "next/navigation";
import { TestOnboardingClient } from "./TestOnboardingClient";

export default function TestOnboardingPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <TestOnboardingClient />;
}
