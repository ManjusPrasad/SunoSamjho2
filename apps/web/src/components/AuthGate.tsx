import React, { FormEvent, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ArrowLeft, ArrowRight, AudioLines, Check, Globe2, Languages, LockKeyhole, Mail, Mic2, Radio, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { firebaseAuth } from '../services/firebase';

interface AuthGateProps {
  onVerified: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

const getAuthErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Sign in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect. Check your details and try again.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a little while, then try again.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Enable it in Firebase Console under Authentication → Sign-in method.';
    case 'auth/unauthorized-continue-uri':
    case 'auth/invalid-continue-uri':
      return 'Firebase is blocking the return address. Add localhost to Authentication → Settings → Authorized domains.';
    default:
      return 'Authentication could not be completed. Check your Firebase settings and try again.';
  }
};

export const AuthGate: React.FC<AuthGateProps> = ({ onVerified }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!firebaseAuth) {
      setError('Sign-in is not configured yet. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID in your hosting provider’s frontend environment variables, enable Email/Password in Firebase Authentication, and redeploy the site.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'forgot') {
        await sendPasswordResetEmail(firebaseAuth, email.trim(), {
          url: window.location.origin,
          handleCodeInApp: false,
        });
        setNotice(`If an account exists for ${email.trim()}, Firebase has sent a password-reset email. Check your inbox and spam folder.`);
      } else if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        setMode('verify');
        await sendEmailVerification(credential.user, {
          url: window.location.origin,
          handleCodeInApp: false,
        });
        setMode('verify');
        setNotice(`We sent a verification email to ${email.trim()}. Open the link to verify your address, then return here and select “I've verified my email”. Check your spam or junk folder if it isn't in your inbox.`);
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (!credential.user.emailVerified) {
          setMode('verify');
          setNotice(`Your email address isn't verified yet. Check your inbox and spam or junk folder for the verification link sent to ${email.trim()}.`);
        } else {
          onVerified();
        }
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    const user = firebaseAuth?.currentUser;
    if (!user) {
      setError('For your security, sign in with your email and password before requesting another verification email.');
      changeMode('login');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendEmailVerification(user, {
        url: window.location.origin,
        handleCodeInApp: false,
      });
      setNotice(`A new verification email was sent to ${user.email}. Check your inbox and spam or junk folder.`);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const checkVerification = async () => {
    const user = firebaseAuth?.currentUser;
    if (!user) {
      setError('Sign in again after verifying your email to continue.');
      changeMode('login');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await user.reload();
      if (firebaseAuth?.currentUser?.emailVerified) {
        onVerified();
      } else {
        setNotice('Your email is not verified yet. Open the verification link from your email, then try again. Check your spam or junk folder if needed.');
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'register'
    ? 'Create your account.'
    : mode === 'forgot'
      ? 'Reset your password.'
      : mode === 'verify'
        ? 'Verify your email.'
        : 'Welcome back.';

  const subtitle = mode === 'register'
    ? 'Create an account with your email and password. We’ll email you a verification link before you can continue.'
    : mode === 'forgot'
      ? 'Enter the email address on your account and we’ll send you a password-reset link.'
      : mode === 'verify'
        ? 'Email verification keeps your account secure. Open the verification link in your email, then come back here.'
        : 'Sign in to continue, or create an account to get started.';

  return (
    <main className="auth-screen">
      <div className="auth-aurora auth-aurora-one" />
      <div className="auth-aurora auth-aurora-two" />
      <div className="auth-grid" />
      <div className="auth-noise" />

      <section className="auth-layout" aria-label="SunoSamjho account access">
        <div className="auth-story">
          <div className="auth-brand"><span><Mic2 size={19} /></span> SunoSamjho <b>LIVE</b></div>
          <div className="auth-story-copy">
            <div className="auth-eyebrow"><span className="auth-eyebrow-dot" /> VOICES WITHOUT BORDERS</div>
            <h1>One world.<br /><span>Many voices.</span><br />Understood.</h1>
            <p>Every language deserves to be heard. Meet face to face, speak naturally, and let conversation flow across languages.</p>
          </div>

          <div className="auth-voice-art" aria-hidden="true">
            <div className="auth-orbit auth-orbit-a" /><div className="auth-orbit auth-orbit-b" /><div className="auth-orbit auth-orbit-c" />
            <span className="auth-float-icon auth-float-left"><AudioLines size={18} /></span>
            <span className="auth-float-icon auth-float-right"><Languages size={18} /></span>
            <span className="auth-float-icon auth-float-top"><Globe2 size={17} /></span>
            <div className="auth-voice-core"><Waves size={39} strokeWidth={1.5} /></div>
            <span className="auth-language auth-language-left">नमस्ते</span>
            <span className="auth-language auth-language-right">ನಮಸ್ಕಾರ</span>
          </div>

          <div className="auth-story-foot"><ShieldCheck size={15} /> Your voice. Your conversation. Your control.</div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-mobile-brand"><span><Mic2 size={18} /></span> SunoSamjho <b>LIVE</b></div>
            <div className="auth-step-mark"><span>{mode === 'verify' ? <Mail size={18} /> : mode === 'forgot' ? <LockKeyhole size={18} /> : <Sparkles size={18} />}</span><i>SECURE ACCESS</i></div>
            <h2>{title}</h2>
            <p className="auth-card-subtitle">{subtitle}</p>

            {mode === 'verify' ? (
              <div className="auth-form">
                <button className="auth-submit" type="button" onClick={checkVerification} disabled={busy || !firebaseAuth}>
                  {busy ? 'Checking verification…' : <>I've verified my email <Check size={17} /></>}
                </button>
                <button className="auth-resend" type="button" onClick={resendVerification} disabled={busy || !firebaseAuth}>
                  {busy ? 'Please wait…' : 'Resend verification email'}
                </button>
                <button className="auth-back" type="button" onClick={async () => { if (firebaseAuth) await signOut(firebaseAuth); changeMode('login'); }}>
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label htmlFor="auth-email">Email address</label>
                <div className="auth-input-wrap"><Mail size={17} /><input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></div>
                {mode !== 'forgot' && (
                  <>
                    <label htmlFor="auth-password">{mode === 'register' ? 'Create a password' : 'Password'}</label>
                    <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="auth-password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} maxLength={128} /></div>
                  </>
                )}
                <button className="auth-submit" type="submit" disabled={busy || !email.trim() || (mode !== 'forgot' && !password)}>
                  {busy ? 'Please wait…' : mode === 'forgot' ? <>Send reset link <ArrowRight size={17} /></> : mode === 'register' ? <>Create account <ArrowRight size={17} /></> : <>Sign in <ArrowRight size={17} /></>}
                </button>
                {mode === 'login' && <button className="auth-resend" type="button" onClick={() => changeMode('forgot')}>Forgot password?</button>}
              </form>
            )}

            {error && <div className="auth-message auth-error" role="alert">{error}</div>}
            {notice && <div className="auth-message auth-notice" role="status"><Check size={15} />{notice}</div>}

            {mode !== 'verify' && (
              <div className="auth-mode-switch">
                {mode === 'forgot' ? (
                  <button className="auth-back" type="button" onClick={() => changeMode('login')}><ArrowLeft size={14} /> Back to sign in</button>
                ) : (
                  <p>
                    {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                    <button type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button>
                  </p>
                )}
              </div>
            )}

            <div className="auth-divider"><span /> BUILT FOR REAL CONVERSATION <span /></div>
            <div className="auth-feature-row"><span><Radio size={14} /> Live rooms</span><span><Languages size={14} /> 9 languages</span></div>
          </div>
        </div>
      </section>
    </main>
  );
};
