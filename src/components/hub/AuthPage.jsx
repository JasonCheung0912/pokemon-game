import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import GoogleIcon from '@/components/GoogleIcon';
import { deviceSignedUp, markDeviceSignedUp } from '@/components/hub/profile';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import * as audio from '@/game/audio';

// ─── Sign up / Log in gateway — opens right after clicking Jasytherion ───
// First visit on a device → sign up page. Once signed up, this device always
// opens the streamlined login page. Every player gets their own account.
export function AuthPage({ onDone, onBack }) {
  const [mode, setMode] = useState(() => (deviceSignedUp() ? 'login' : 'signup'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  const finish = async () => {
    markDeviceSignedUp();
    try { const u = await base44.auth.me(); onDone(u); } catch (e) { onDone(null); }
  };

  const handleGoogle = () => {
    audio.sfx.click();
    markDeviceSignedUp();
    base44.auth.loginWithProvider('google', window.location.origin + '/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await base44.auth.loginViaEmailPassword(email, password);
        await finish();
      } else {
        await base44.auth.register({ email, password });
        setShowOtp(true);
      }
    } catch (err) {
      setError(err.message || (mode === 'login' ? 'Invalid email or password' : 'Registration failed'));
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(''); setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      await finish();
    } catch (err) { setError(err.message || 'Invalid verification code'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    try { await base44.auth.resendOtp(email); } catch (e) { setError(e.message || 'Failed to resend code'); }
  };

  if (showOtp) {
    return (
      <div className="min-h-full flex items-center justify-center px-4 py-8 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-900">Welcome to the Pokémon Game</h1>
          <p className="text-center text-slate-500 mt-2 font-medium">Verify your email to finish signing up</p>
          {error && <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}
          <div className="flex justify-center my-6">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <button onClick={handleVerify} disabled={loading || otp.length < 6}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-colors">
            {loading ? 'Verifying…' : 'Verify & Play'}
          </button>
          <p className="text-center text-sm text-slate-500 mt-4">
            Didn't receive the code? <button onClick={handleResend} className="text-indigo-600 font-bold hover:underline">Resend</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-8 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <button onClick={() => { audio.sfx.click(); onBack?.(); }} className="text-sm text-slate-400 hover:text-slate-600 font-bold">← Back</button>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 mt-2">Welcome to the Pokémon Game</h1>
        <p className="text-center text-slate-500 mt-2 font-medium">
          {mode === 'signup' ? 'Create your trainer account to start' : 'Sign in to continue'}
        </p>

        <button onClick={handleGoogle}
          className="mt-6 w-full py-3.5 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50
            flex items-center justify-center gap-3 font-semibold text-slate-800 transition-colors">
          <GoogleIcon className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-xs font-bold tracking-widest">OR</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 font-bold text-sm mb-1.5">Email</label>
            <input type="email" required autoComplete="email" autoFocus placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-slate-900" />
          </div>
          <div>
            <label className="block text-slate-700 font-bold text-sm mb-1.5">Password</label>
            <input type="password" required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-slate-900" />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="block text-slate-700 font-bold text-sm mb-1.5">Confirm Password</label>
              <input type="password" required autoComplete="new-password" placeholder="••••••••"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-slate-900" />
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-colors">
            {loading ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        {mode === 'signup' && (
          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <button onClick={() => { audio.sfx.click(); setMode('login'); setError(''); }}
              className="text-indigo-600 font-bold hover:underline">Log in</button>
          </p>
        )}
      </div>
    </div>
  );
}