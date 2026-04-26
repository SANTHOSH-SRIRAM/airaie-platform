import { useUiStore } from '@store/uiStore';
import SidebarNavigation from './SidebarNavigation';
import NodePalette from '@components/workflows/NodePalette';
import SessionList from '@components/agents/SessionList';
import FilterSidebar from '@components/tools/FilterSidebar';
import ArtifactsSidebar from '@components/artifacts/ArtifactsSidebar';
import ProfileSidebar from '@components/profile/ProfileSidebar';
import ToolDetailSidebar from '@components/tools/ToolDetailSidebar';
import CardDetailSidebar from '@components/cards/sidebar/CardDetailSidebar';

/**
 * Routes sidebar content based on uiStore.sidebarContentType.
 * Uses CSS hiding (not conditional rendering) to keep all content mounted
 * so that iframes and scroll positions are preserved.
 */
export default function SidebarContentRouter() {
  const contentType = useUiStore((s) => s.sidebarContentType);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Navigation (default sidebar content) */}
      <div className={contentType === 'navigation' ? 'contents' : 'hidden'}>
        <SidebarNavigation />
      </div>

      {/* Node Palette — workflow editor */}
      <div className={contentType === 'nodePalette' ? 'contents' : 'hidden'}>
        <NodePalette />
      </div>

      {/* Sessions list — agent playground */}
      <div className={contentType === 'sessions' ? 'contents' : 'hidden'}>
        <SessionList />
      </div>

      {/* Filters — tool registry */}
      <div className={contentType === 'filters' ? 'contents' : 'hidden'}>
        <FilterSidebar />
      </div>

      {/* Artifacts left sidebar */}
      <div className={contentType === 'artifacts' ? 'contents' : 'hidden'}>
        <ArtifactsSidebar />
      </div>

      {/* Profile sidebar */}
      <div className={contentType === 'profile' ? 'contents' : 'hidden'}>
        <ProfileSidebar />
      </div>

      {/* Tool Detail sidebar */}
      <div className={contentType === 'tool-detail' ? 'contents' : 'hidden'}>
        <ToolDetailSidebar />
      </div>

      {/* Card Detail sidebar — Phase 8 Card-as-page (08-01) */}
      <div className={contentType === 'card-detail' ? 'contents' : 'hidden'}>
        <CardDetailSidebar />
      </div>
    </div>
  );
}
