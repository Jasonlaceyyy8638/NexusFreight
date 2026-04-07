import { DashboardSettingsHeader } from "@/components/dashboard/DashboardSettingsHeader";
import { DashboardSettingsPage } from "@/components/dashboard/DashboardSettingsPage";

export default function DashboardSettingsRoutePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <DashboardSettingsHeader />
      <DashboardSettingsPage />
    </div>
  );
}
