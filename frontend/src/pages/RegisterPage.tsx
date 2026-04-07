import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  UserPlus,
  GitBranch,
  Brain,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import airaielogo from '@/assets/airaie-logo.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName || !email || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms and Privacy Policy');
      return;
    }

    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      await register(fullName, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
            <div className="flex items-center gap-3 mb-6">
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
              Create Your Workspace Access
            </p>

            {/* Heading */}
            <h1 className="text-[26px] font-bold text-[#1a1a1a] leading-[1.25] mb-3">
              Create your account and<br />start building engineering<br />workflows.
            </h1>

            {/* Description */}
            <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-6">
              Set up your workspace access to manage workflows, tool registries, AI agents, governance boards, and execution history from one unified engineering platform.
            </p>

            {/* Feature Cards */}
            <div className="flex flex-col gap-2">
              {[
                {
                  Icon: GitBranch,
                  title: 'Workflow orchestration',
                  desc: 'Create simulation pipelines, validate outputs, and manage execution flow from a single workspace.',
                },
                {
                  Icon: Brain,
                  title: 'AI agent operations',
                  desc: 'Configure autonomous engineering agents with tool permissions, policies, and decision visibility.',
                },
                {
                  Icon: ShieldCheck,
                  title: 'Governance-ready execution',
                  desc: 'Track approvals, evidence gates, and release readiness with a complete engineering audit trail.',
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
        <div className="w-[420px] shrink-0 bg-white rounded-2xl border border-[#ece9e3] shadow-card p-8 flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#949494] uppercase mb-2">
              Account Setup
            </p>
            <h2 className="text-[26px] font-bold text-[#1a1a1a] leading-tight mb-2">Create account</h2>
            <p className="text-[12.5px] text-[#6b6b6b] leading-relaxed">
              Use your workspace details to register and continue to your engineering dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 flex-1">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* First name + Last name */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="firstName" className="block text-[12.5px] font-medium text-[#1a1a1a] mb-1.5">
                  First name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Santhosh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    autoFocus
                    className="w-full pl-8 pr-3 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="lastName" className="block text-[12.5px] font-medium text-[#1a1a1a] mb-1.5">
                  Last name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                  <input
                    id="lastName"
                    type="text"
                    placeholder="K"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className="w-full pl-8 pr-3 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[12.5px] font-medium text-[#1a1a1a] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-8 pr-3 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[12.5px] font-medium text-[#1a1a1a] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-8 pr-10 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-[12.5px] font-medium text-[#1a1a1a] mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#acacac]" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-8 pr-10 py-2.5 text-[13px] border border-[#ece9e3] rounded-lg bg-white placeholder-[#acacac] text-[#1a1a1a] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#acacac] hover:text-[#6b6b6b] transition-colors"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-center gap-2">
              <div
                onClick={() => setAgreeTerms(!agreeTerms)}
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                  agreeTerms ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'bg-white border-[#ece9e3]'
                }`}
              >
                {agreeTerms && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[11.5px] text-[#6b6b6b]">
                I agree to the{' '}
                <a href="#" className="text-[#1a1a1a] underline underline-offset-2 hover:text-[#6b6b6b] transition-colors">
                  Terms
                </a>{' '}
                and{' '}
                <a href="#" className="text-[#1a1a1a] underline underline-offset-2 hover:text-[#6b6b6b] transition-colors">
                  Privacy Policy
                </a>
              </span>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              <UserPlus size={15} />
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
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

            {/* Already have account info box */}
            <div className="flex items-start gap-3 p-3.5 bg-[#f0faf0] border border-[#c8e6c9] rounded-xl">
              <CheckCircle2 size={15} className="text-[#43a047] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[#1a1a1a] mb-0.5">Already have an account?</p>
                <p className="text-[11px] text-[#6b6b6b] leading-relaxed">
                  Use your existing workspace credentials to sign in and continue where you left off.
                </p>
              </div>
            </div>

            {/* Sign in link */}
            <p className="text-[11.5px] text-[#6b6b6b] text-center">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#1a1a1a] font-medium underline underline-offset-2 hover:text-[#6b6b6b] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
