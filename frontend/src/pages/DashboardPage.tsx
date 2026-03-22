import StudioHeader from '@components/dashboard/StudioHeader';
import StartProjectCard from '@components/dashboard/StartProjectCard';
import RecentWorkflowsCard from '@components/dashboard/RecentWorkflowsCard';
import SystemLoadCard from '@components/dashboard/SystemLoadCard';
import EnterpriseLicenseCard from '@components/dashboard/EnterpriseLicenseCard';

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1584px]">
      <StudioHeader />
      <StartProjectCard />
      <div className="grid grid-cols-3 gap-4">
        <RecentWorkflowsCard />
        <SystemLoadCard />
        <EnterpriseLicenseCard />
      </div>
    </div>
  );
}
