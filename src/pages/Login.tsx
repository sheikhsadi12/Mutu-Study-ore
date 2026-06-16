import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate(from, { replace: true });
      }
    });
  }, [navigate, from]);

  const handleLogin = async () => {
    // Check if running inside the AI Studio iframe
    if (window !== window.parent) {
      alert("Google Login is blocked by Google inside preview iframes.\n\nPlease either:\n1. Use the Email/Password login below.\n2. Click the 'Open in New Tab' icon (top right of preview) to use Google Login.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) {
      console.error('Error logging in:', error);
      alert('Failed to login with Google.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        alert('Password reset link sent! Please check your email.');
        setIsResetPassword(false);
      } else if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data?.user?.identities?.length === 0) {
           alert('This email is already registered. Please sign in instead.');
        } else {
           alert('Account created!\n\nIf you cannot log in, please ensure "Confirm email" is DISABLED in your Supabase Dashboard -> Authentication -> Providers -> Email setting. (Emails often fail to send on the free tier).');
           setIsSignUp(false); // Switch to sign in mode automatically
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg p-4 md:p-6 flex-col">
      <div className="w-full max-w-md card-base shadow-2xl p-6 md:p-10 border border-theme-border/50 bg-theme-muted/10 backdrop-blur rounded-[20px] text-center">
        <h1 className="text-3xl md:text-4xl font-heading font-black text-theme-accent-start mb-2 tracking-tight">MUTU STUDY</h1>
        <p className="text-sm md:text-base text-theme-text/70 mb-8 font-medium">Please sign in to continue.</p>
        
        {!isResetPassword && (
          <>
            <button
              onClick={handleLogin}
              className="w-full bg-theme-border text-theme-text/90 font-bold py-3.5 md:py-4 px-6 rounded-xl md:rounded-2xl shadow-sm hover:opacity-90 flex items-center justify-center gap-3 transition-colors border border-theme-border mb-6 text-sm md:text-base"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-theme-border/80"></div>
              <span className="flex-shrink-0 mx-4 text-theme-text/40 text-[10px] md:text-xs font-bold uppercase tracking-wider">Or continue with Email</span>
              <div className="flex-grow border-t border-theme-border/80"></div>
            </div>
          </>
        )}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 text-left">
          {isResetPassword && (
            <p className="text-sm text-theme-text/80 mb-2 font-medium text-center">Enter your email address and we'll send you a link to reset your password.</p>
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-theme-bg border border-theme-border text-theme-text text-base md:text-sm rounded-xl px-4 py-3.5 outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all"
            required
          />
          {!isResetPassword && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border text-theme-text text-base md:text-sm rounded-xl px-4 py-3.5 outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all"
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-text/50 hover:text-theme-text/80 p-2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          )}

          {!isResetPassword && !isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsResetPassword(true)}
                className="text-xs md:text-sm text-theme-accent-end hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-bold py-3.5 md:py-4 px-6 rounded-xl md:rounded-2xl shadow-md hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all mt-2 disabled:opacity-50 text-base"
          >
            {loading ? 'Processing...' : (isResetPassword ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Sign In'))}
          </button>
          
          {isResetPassword && (
             <p className="text-[10px] md:text-xs text-theme-text/50 mt-2 text-center">
               Note: Password reset emails may take a moment or fail due to free-tier email limits.
             </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs md:text-sm text-theme-text/60">
          {isResetPassword ? (
             <button 
                type="button"
                onClick={() => setIsResetPassword(false)} 
                className="font-bold hover:underline"
              >
                Back to Sign In
              </button>
          ) : (
             <>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)} 
                  className="ml-2 text-theme-accent-start font-bold hover:underline"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
             </>
          )}
        </p>

        <p className="mt-8 text-[10px] md:text-xs text-theme-text/40 tracking-wider uppercase font-bold">
          Role-Based Access Controlled
        </p>
      </div>
    </div>
  );
}
