import StudioHeader from '@components/dashboard/StudioHeader';
import StartProjectCard from '@components/dashboard/StartProjectCard';
import RecentWorkflowsCard from '@components/dashboard/RecentWorkflowsCard';
import SystemLoadCard from '@components/dashboard/SystemLoadCard';
import EnterpriseLicenseCard from '@components/dashboard/EnterpriseLicenseCard';

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Studio Title + Status */}
      <StudioHeader />

      {/* Start Project + Quick Actions (single card) */}
      <StartProjectCard />

      {/* Bottom 3-column grid */}
      <div className="grid grid-cols-3 gap-5">
        <RecentWorkflowsCard />
        <SystemLoadCard />
        <EnterpriseLicenseCard />
      </div>
    </div>
  );
}
