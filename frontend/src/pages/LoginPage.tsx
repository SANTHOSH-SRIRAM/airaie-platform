import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  GitBranch,
  Brain,
  ShieldCheck,
  AlertCircle,
  Fingerprint,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import airaielogo from '@/assets/airaie-logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0ec] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[980px] flex gap-4 items-stretch">

        {/* ── LEFT PANEL ── */}
        <div className="flex-1 bg-white rounded-2xl border border-[#ece9e3] shadow-card p-8 flex flex-col justify-between min-h-[560px]">
          {/* Top section */}
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0">
                <img src={airaielogo} alt="Airaie" className="w-5 h-5 brightness-0 invert" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#1a1a1a] tracking-widest leading-none">AIRAIE</p>
                <p className="text-[11px] text-[#949494] mt-0.5 leading-none">Engineering automation platform</p>
              </div>
            </div>

            {/* Label */}
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#949494] uppercase mb-4">
              Secure Workspace Access
            </p>

            {/* Heading */}
            <h1 className="text-[26px] font-bold text-[#1a1a1a] leading-[1.25] mb-3">
              Sign in to your engineering<br />workspace.
            </h1>

            {/* Description */}
            <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-5">
              Access workflows, agents, tools, and governance in one place.
            </p>

            {/* Tags */}
            <div className="flex items-center gap-2 mb-7 flex-wrap">
              {['Workflows', 'AI agents', 'Governance'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f8f7] border border-[#ece9e3] rounded-full text-[11px] text-[#2d2d2d] font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50] shrink-0" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Feature Cards */}
            <div className="flex flex-col gap-2">
              {[
                {
                  Icon: GitBranch,
                  title: 'Workflow orchestration',
                  desc: 'Run simulation pipelines with clear execution tracking.',
                },
                {
                  Icon: Brain,
                  title: 'Agent decisions',
                  desc: 'Review confidence, policies, and automated actions.',
                },
                {
                  Icon: ShieldCheck,
                  title: 'Approval-ready records',
                  desc: 'Track evidence, gates, and release readiness.',
                },
              ].map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-[#ece9e3] bg-[#fbfaf9]"
                >
                  <div className="w-7 h-7 rounded-md bg-[#f0f0ec] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-[#2d2d2d]" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-[#1a1a1a] leading-snug">{title}</p>
                    <p className="text-[11px] text-[#949494] mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-[#f0ede7]">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6b6b6b] px-2.5 py-1 bg-[#f8f8f7] border border-[#ece9e3] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" />
              System operational
            </span>
            <span className="text-[11px] text-[#949494]">Protected access · SSO ready</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-[400px] shrink-0 bg-white rounded-2xl border border-[#ece9e3] shadow-card p-8 flex flex-col">
          {/* Header */}
          <div className="mb-7">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#949494] uppercase mb-2">
              Account Access
            </p>
            <h2 className="text-[26px] font-bold text-[#1a1a1a] leading-tight mb-2">Welcome back</h2>
            <p className="text-[12.5px] text-[#6b6b6b] leading-relaxed">
              Sign in with your workspace email and password to continue to your engineering dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[12.5px] font-medium text-[#1a1a1a] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-[12.5px] font-medium text-[#1a1a1a]">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11.5px] text-[#1a1a1a] underline underline-offset-2 hover:text-[#6b6b6b] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#acacac] hover:text-[#6b6b6b] transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember device + Workspace protected */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setRememberDevice(!rememberDevice)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer ${
                    rememberDevice
                      ? 'bg-[#1a1a1a] border-[#1a1a1a]'
                      : 'bg-white border-[#ece9e3]'
                  }`}
                >
                  {rememberDevice && <CheckSquare size={11} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-[11.5px] text-[#6b6b6b]">Remember this device</span>
              </label>
              <span className="text-[11px] text-[#949494]">Workspace protected</span>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-60 mt-1"
            >
              <LogIn size={15} />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[#ece9e3]" />
              <span className="text-[11px] text-[#acacac]">or continue with</span>
              <div className="flex-1 h-px bg-[#ece9e3]" />
            </div>

            {/* SSO Button */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#ece9e3] bg-white hover:bg-[#f8f8f7] text-[#1a1a1a] text-[13px] font-medium rounded-lg transition-colors"
            >
              <Fingerprint size={15} className="text-[#6b6b6b]" />
              Single sign-on
            </button>

            {/* Need credentials info box */}
            <div className="flex items-start gap-3 p-3.5 bg-[#fff8f0] border border-[#f0d9b5] rounded-xl">
              <AlertCircle size={15} className="text-[#f57c00] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[#1a1a1a] mb-0.5">Need credentials?</p>
                <p className="text-[11px] text-[#6b6b6b] leading-relaxed">
                  Use your assigned workspace email and password. If you want me to prefill exact credentials on this
                  page, send the email and password values.
                </p>
              </div>
            </div>

            {/* Sign up link */}
            <p className="text-[11.5px] text-[#6b6b6b] text-center mt-auto">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#1a1a1a] font-medium underline underline-offset-2 hover:text-[#6b6b6b] transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
