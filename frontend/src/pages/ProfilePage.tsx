import { useState, useEffect } from 'react';
import { useUiStore } from '@store/uiStore';
import {
  Edit2, Key,
  Activity, MonitorPlay, PieChart, Bell, Settings,
  AlertTriangle, Copy, Eye,
  ChevronDown, Play, CheckCircle2,
  Camera, ShieldCheck
} from 'lucide-react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

// TODO(backend): wire to a real `/v0/audit/user/:id` (or similar) endpoint
// when the kernel ships per-user activity. Until then the timeline renders
// an empty state — preferable to faking history that doesn't reflect what
// the user actually did.
type ActivityEntry = {
  id: number;
  text: string;
  sub: string;
  icon: typeof Play;
  color: string;
  bg: string;
};
const RECENT_ACTIVITY: ActivityEntry[] = [];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ProfileHeader() {
  return (
    <div id="overview" className="bg-white rounded-[12px] border border-[#ece9e3] shadow-sm mb-4 flex border-t-8 border-t-[#2d2d2d] overflow-hidden">
      {/* Left Avatar & Info */}
      <div className="flex-1 p-8 border-r border-[#f0f0ec] pr-12">
        <div className="flex items-start gap-6">
          <div className="relative shrink-0">
            <div className="w-[88px] h-[88px] bg-[#2d2d2d] rounded-full flex items-center justify-center text-[36px] text-white font-bold font-sans shadow-sm">
              S
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-[#ece9e3] shadow-sm rounded-full flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
              <Camera size={12} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-[28px] font-bold text-[#1a1a1a] leading-none mb-2">Santhosh</h1>
            
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-[#6b6b6b]">santhosh@airaie.io</span>
              <span className="flex items-center gap-1.5 text-[#4caf50] font-medium text-[12px] bg-[#e8f5e9] px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} strokeWidth={3} /> Verified
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-[13px]">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f5f0] text-[#1a1a1a] font-medium rounded-full">
                <ShieldCheck size={14} /> Admin
              </span>
            </div>

            <p className="text-[14px] text-[#6b6b6b] font-medium mt-3">Organization: Airaie Engineering</p>

            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="px-3 py-1 bg-[#f5f5f0] text-[#6b6b6b] text-[12px] font-medium rounded-full">Member since Mar 2026</span>
              <span className="px-3 py-1 bg-[#f5f5f0] text-[#6b6b6b] text-[12px] font-medium rounded-full">Default Project</span>
              <span className="px-3 py-1 bg-[#f5f5f0] text-[#1a1a1a] text-[12px] font-bold rounded-full">Admin access</span>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button className="flex items-center gap-2 px-4 py-2 border border-[#acacac] rounded-[8px] text-[13px] font-bold text-[#6b6b6b] hover:bg-[#f5f5f0] hover:text-[#1a1a1a] transition-colors">
                <Edit2 size={14} /> Edit Profile
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-[#acacac] rounded-[8px] text-[13px] font-bold text-[#6b6b6b] hover:bg-[#f5f5f0] hover:text-[#1a1a1a] transition-colors">
                <Key size={14} /> Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Stats */}
      <div className="w-[320px] p-8 bg-[#fafaf8] shrink-0 flex flex-col justify-between">
        <div>
          <h3 className="text-[11px] font-bold text-[#acacac] uppercase tracking-[0.08em] mb-4">Platform Activity</h3>
          <div className="flex flex-col gap-3.5">
            {[
              { label: 'Workflows created', val: '8' },
              { label: 'Agents configured', val: '3' },
              { label: 'Tools registered', val: '14' },
              { label: 'Boards managed', val: '2' },
              { label: 'Total runs', val: '156' },
              { label: 'Gates approved', val: '12' },
            ].map(s => (
              <div key={s.label} className="flex flex-row justify-between text-[13px]">
                <span className="text-[#6b6b6b] font-medium">{s.label}</span>
                <span className="text-[#1a1a1a] font-mono font-medium">{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-[#ece9e3] mt-6">
          <h3 className="text-[10px] font-bold text-[#acacac] uppercase tracking-[0.08em] mb-3">Current Session</h3>
          <div className="flex items-center gap-2 text-[13px] text-[#6b6b6b] font-medium">
            <span className="flex items-center gap-1.5 text-[#4caf50]">
              <span className="w-2 h-2 rounded-full bg-[#4caf50]"></span> Active now
            </span>
            <span>·</span>
            <span>Chrome · Windows 11</span>
          </div>
          <p className="text-[11px] text-[#acacac] mt-1.5">Last login: Today, 08:15 AM</p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ id, title, icon: Icon, children, badge, headerAction }: any) {
  return (
    <div id={id} className="bg-white rounded-[12px] border border-[#ece9e3] shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0ec]">
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-[#1a1a1a]" strokeWidth={2.5} />
          <h2 className="text-[16px] font-bold text-[#1a1a1a]">{title}</h2>
          {badge && <span className="px-2 py-0.5 bg-[#f5f5f0] text-[#6b6b6b] text-[11px] font-semibold rounded-full">{badge}</span>}
        </div>
        {headerAction}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ label, pct, color, max }: { label:string, pct:number, color:string, max:string }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between text-[13px] font-medium mb-1.5">
        <span className="text-[#1a1a1a]">{label}</span>
        <span className={cn(pct > 90 ? 'text-[#ff9800]' : 'text-[#6b6b6b]')}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-[#f5f5f0] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }}></div>
      </div>
      <div className="text-[11px] text-[#949494] mt-1.5">{max}</div>
    </div>
  );
}

function ToggleRow({ label, sub, checked = false }: { label:string, sub:string, checked?:boolean }) {
  const [on, setOn] = useState(checked);
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f0f0ec] last:border-0 last:pb-0">
      <div>
        <div className="text-[13px] font-bold text-[#1a1a1a]">{label}</div>
        <div className="text-[12px] text-[#6b6b6b] mt-0.5">{sub}</div>
      </div>
      <button 
        onClick={() => setOn(!on)}
        className={cn(
          "w-10 h-6 rounded-full p-1 transition-colors relative",
          on ? "bg-[#4caf50]" : "bg-[#d5d5cf]"
        )}
      >
        <div className={cn(
          "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
          on ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function ApiKeyRow({ name, val, active, date }: any) {
  return (
    <div className="flex flex-col gap-3 p-4 border border-[#ece9e3] rounded-[8px] bg-[#fbfaf9] mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[#1a1a1a]">
          <Key size={14} className="text-[#949494]" />
          {name}
        </div>
        {active ? (
          <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#4caf50] text-[11px] font-bold rounded-[4px] uppercase tracking-wider">Active</span>
        ) : (
          <span className="px-2 py-0.5 bg-[#ffebee] text-[#e74c3c] text-[11px] font-bold rounded-[4px] uppercase tracking-wider">Revoked</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-[#acacac]">KEY</span>
        <div className="flex-1 flex items-center bg-[#f0f0ec] border border-[#ece9e3] rounded-[6px] px-3 py-1.5 font-mono text-[13px] text-[#6b6b6b]">
          <span className="flex-1 truncate">{val}</span>
          <div className="flex items-center gap-2 ml-4">
            <button className="text-[#949494] hover:text-[#1a1a1a]"><Eye size={14} /></button>
            <button className="text-[#949494] hover:text-[#1a1a1a]"><Copy size={14} /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#949494] mt-1">
        <span>Created {date} · Last used 2 hours ago</span>
        {active && <button className="text-[#e74c3c] font-bold hover:underline">Revoke</button>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const activeSection = useUiStore((s) => s.activeProfileSection);

  // Smooth scroll to section when sidebar changes
  useEffect(() => {
    if (activeSection) {
      const el = document.getElementById(activeSection);
      if (el) {
        // Calculate position considering header offset + padding
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, [activeSection]);

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pt-4 pb-12 flex flex-col gap-4">
      
      {/* 1. Overview */}
      <ProfileHeader />

      {/* 2. Recent Activity */}
      <SectionCard id="activity" title="Recent Activity" icon={Activity} headerAction={
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[#ece9e3] rounded-[6px] bg-white hover:bg-[#f5f5f0]">
          Last 7 days <ChevronDown size={14} />
        </button>
      }>
        <div className="flex flex-col gap-0">
          {RECENT_ACTIVITY.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity size={20} className="text-[#cdc8bf] mb-2" />
              <p className="text-[12px] font-medium text-[#6b6b6b]">No recent activity</p>
              <p className="text-[11px] text-[#acacac] mt-1 max-w-[260px]">
                Runs you start, approvals you make, and agent escalations will appear here.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-[#acacac] uppercase tracking-wider mb-4">Today</p>
              <div className="relative pl-6 border-l-2 border-[#f0f0ec] ml-3 pb-8 space-y-6">
                {RECENT_ACTIVITY.map((a, i) => (
                  <div key={i} className="relative">
                    <div className={cn("absolute -left-[31px] top-0.5 w-[14px] h-[14px] rounded-full border-2 border-white flex items-center justify-center", a.bg, a.color.replace('text', 'border'))}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", a.color.replace('text', 'bg'))} />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[13px] font-bold text-[#1a1a1a]">{a.text}</p>
                        <p className="text-[12px] text-[#6b6b6b] mt-0.5">{a.sub}</p>
                      </div>
                      <span className="text-[11px] text-[#acacac] whitespace-nowrap">2m ago</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-[13px] font-bold text-[#1976d2] hover:underline mx-auto block">View all activity →</button>
            </>
          )}
        </div>
      </SectionCard>

      {/* 3. API Keys */}
      <SectionCard id="api-keys" title="API Keys" badge="2 Active" icon={Key} headerAction={
        <button className="px-4 py-2 bg-white border border-[#ece9e3] shadow-sm rounded-[6px] text-[13px] font-bold text-[#1a1a1a] hover:bg-[#f5f5f0]">
          Create API Key
        </button>
      }>
        <div className="flex flex-col gap-2">
          <ApiKeyRow name="PRODUCTION API KEY" val="ak_prod_2xP0c5sT2..." active={true} date="Jan 12 2024" />
          <ApiKeyRow name="CLI Developer Key" val="ak_dev_9sMv4pL1..." active={true} date="Feb 02 2024" />
        </div>
      </SectionCard>

      {/* 4. Active Sessions */}
      <SectionCard id="sessions" title="Active Sessions" badge="2 Sessions" icon={MonitorPlay}>
        <div className="flex flex-col">
          <div className="py-3 border-b border-[#f0f0ec] flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#1a1a1a]">Current Session <span className="text-[10px] bg-[#e8f5e9] text-[#4caf50] px-1.5 py-0.5 rounded font-bold uppercase">This Device</span></div>
              <div className="text-[12px] text-[#6b6b6b] mt-0.5">Chrome 122 · Windows 11 · New York, USA</div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#4caf50]"></span>
              <span className="text-[12px] font-bold text-[#4caf50]">Active now</span>
            </div>
          </div>
          <div className="py-3 border-b border-[#f0f0ec] flex justify-between items-start">
            <div>
              <div className="text-[14px] font-bold text-[#1a1a1a]">API Key (Production)</div>
              <div className="text-[12px] text-[#6b6b6b] mt-0.5">ak_prod_...pTc2 · 10:23 AM · IP 192.168.1.104</div>
            </div>
            <button className="text-[12px] text-[#e74c3c] font-bold hover:underline mt-1">Revoke</button>
          </div>
        </div>
      </SectionCard>

      {/* 5. Usage & Quotas */}
      <SectionCard id="usage" title="Usage & Quotas" icon={PieChart} headerAction={
        <div className="text-[11px] text-[#949494] font-medium">Current billing cycle: Mar 1 - Mar 31</div>
      }>
        <div className="flex flex-col gap-2">
          <ProgressBar label="Artifacts" color="bg-[#ff9800]" pct={94} max="14,100 / 15,000 files" />
          <ProgressBar label="API Calls (Compute)" color="bg-[#4caf50]" pct={12} max="12,040 / 100,000 requests" />
          <ProgressBar label="Storage" color="bg-[#2196f3]" pct={42} max="4.2 GB / 10 GB limit" />
          <ProgressBar label="Node Compute Pool" color="bg-[#ff9800]" pct={96} max="96 hours / 100 hours limit" />
        </div>
        <button className="mt-6 text-[13px] font-bold text-[#2196f3] hover:underline">Manage plan and billing →</button>
      </SectionCard>

      {/* 6. Notification Preferences */}
      <SectionCard id="notifications" title="Notification Preferences" icon={Bell}>
        <div className="flex flex-col px-2">
          <ToggleRow label="Run completions" sub="Notify when workflow runs finish" checked={true} />
          <ToggleRow label="Gate approvals" sub="Notify when manual intervention is needed" checked={true} />
          <ToggleRow label="Error alerts" sub="When nodes fail or error unexpectedly" checked={true} />
          <ToggleRow label="Agent escalations" sub="When Agents pause for input on conditions" checked={true} />
          <ToggleRow label="Data exports" sub="Notify about long exports" checked={false} />
          <ToggleRow label="Team member changes" sub="When users join or leave your org" checked={true} />
          <ToggleRow label="System updates" sub="Platform feature and downtime alerts" checked={false} />
          <ToggleRow label="Billing alerts" sub="When quotas reach 80% usage limits" checked={true} />
        </div>
      </SectionCard>

      {/* 7. Preferences */}
      <SectionCard id="preferences" title="Preferences" icon={Settings}>
        <div className="flex flex-col gap-4 max-w-lg">
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="text-[13px] font-bold text-[#1a1a1a]">Theme</p>
              <p className="text-[12px] text-[#6b6b6b]">Set the portal appearance</p>
            </div>
            <div className="flex bg-[#f5f5f0] p-1 rounded-[8px]">
              <button className="px-3 py-1 bg-white shadow-sm rounded-[4px] text-[12px] font-bold text-[#1a1a1a]">Light</button>
              <button className="px-3 py-1 text-[12px] font-medium text-[#6b6b6b] hover:text-[#1a1a1a]">Dark</button>
              <button className="px-3 py-1 text-[12px] font-medium text-[#6b6b6b] hover:text-[#1a1a1a]">System</button>
            </div>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="text-[13px] font-bold text-[#1a1a1a]">Default View</p>
              <p className="text-[12px] text-[#6b6b6b]">Choose grid or list view generally</p>
            </div>
            <select className="px-3 py-1.5 bg-[#f5f5f0] border-transparent rounded-[6px] text-[12px] outline-none font-medium">
              <option>List view</option>
              <option>Grid view</option>
            </select>
          </div>
          <ToggleRow label="Auto-save" sub="Automatically save canvas nodes" checked={true} />
          <ToggleRow label="Advanced tooltips" sub="Show developer variables on hover" checked={true} />
          <div className="flex justify-between items-center py-2 border-b border-[#f0f0ec] pb-4">
            <div>
              <p className="text-[13px] font-bold text-[#1a1a1a]">Time Format</p>
              <p className="text-[12px] text-[#6b6b6b]">Standard 12h or 24h formats</p>
            </div>
            <div className="flex bg-[#f5f5f0] p-1 rounded-[8px]">
              <button className="px-3 py-1 bg-white shadow-sm rounded-[4px] text-[12px] font-bold text-[#1a1a1a]">12h</button>
              <button className="px-3 py-1 text-[12px] font-medium text-[#6b6b6b] hover:text-[#1a1a1a]">24h</button>
            </div>
          </div>
          <div className="flex justify-between items-center py-2 mt-2">
            <div>
              <p className="text-[13px] font-bold text-[#1a1a1a]">Language</p>
              <p className="text-[12px] text-[#6b6b6b]">Interface language</p>
            </div>
            <select className="px-3 py-1.5 bg-[#f5f5f0] border-transparent rounded-[6px] text-[12px] outline-none font-medium">
              <option>English</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 8. Danger Zone */}
      <div id="danger" className="border-t-4 border-[#e74c3c] bg-[#fff5f5] rounded-[12px] mt-8 overflow-hidden shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 text-[#e74c3c] font-bold mb-6">
            <AlertTriangle size={20} />
            <h2 className="text-[18px]">Danger Zone</h2>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-[#ffcdd2]">
            <div>
              <h3 className="text-[14px] font-bold text-[#1a1a1a]">Sign out of all sessions</h3>
              <p className="text-[12px] text-[#6b6b6b] mt-0.5">Revoke all active sessions and API keys immediately.</p>
            </div>
            <button className="px-4 py-2 border border-[#ffcdd2] text-[#e74c3c] bg-white hover:bg-[#ffebee] rounded-[6px] text-[13px] font-bold transition-colors">
              Sign out all
            </button>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-[#ffcdd2]">
            <div>
              <h3 className="text-[14px] font-bold text-[#1a1a1a]">Delete Account</h3>
              <p className="text-[12px] text-[#6b6b6b] mt-0.5">Permanently delete your account and all contained workspaces. This cannot be undone.</p>
            </div>
            <button className="px-4 py-2 border border-[#e74c3c] bg-[#e74c3c] text-white hover:bg-[#c0392b] rounded-[6px] text-[13px] font-bold shadow-sm transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
