import React, { useState, useMemo } from 'react';
import { Shield, Users, LogOut, Lock, Mail, Key, ArrowLeft } from 'lucide-react';
import { isMobileDevice, shouldReduceEffects } from '../utils/performanceUtils';
import { generateOTP, validateOTP, validatePasswordStrength, hashPassword, comparePassword } from '../utils/passwordUtils';
import { emailService } from '../services/emailService';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';

interface LandingPageProps {
  onStaffClick: () => void;
  onStudentClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStaffClick, onStudentClick }) => {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [storedPasswordHash, setStoredPasswordHash] = useState<string | null>(null);

  // Forgot Password Flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'newpassword'>('email'); // email -> otp -> newpassword
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOTP, setForgotOTP] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Mobile detection
  const isMobile = useMemo(() => isMobileDevice(), []);
  const reduceEffects = useMemo(() => shouldReduceEffects(), []);

  // Default staff password - Change in production
  const STAFF_PASSWORD = 'admin123';

  const handleStaffAccess = () => {
    setShowPasswordPrompt(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isMatch = storedPasswordHash
      ? comparePassword(password, storedPasswordHash)
      : password === STAFF_PASSWORD; // fallback to hardcoded password for first-run

    if (isMatch) {
      setShowPasswordPrompt(false);
      setPassword('');
      setPasswordError('');
      onStaffClick();
    } else {
      setPasswordError('❌ Incorrect password. Try again.');
      setPassword('');
    }
  };

  // ===== FORGOT PASSWORD FLOW =====

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail.trim()) {
      setForgotMessage({ type: 'error', text: '❌ Please enter your email' });
      return;
    }

    setSendingOTP(true);
    setForgotMessage(null);

    try {
      // Generate and send OTP
      const otp = generateOTP();
      setGeneratedOTP(otp);

      // Send via EmailJS
      const result = await emailService.sendOTPEmail(forgotEmail, otp);
      
      if (result.success) {
        setForgotMessage({ 
          type: 'success', 
          text: `✅ OTP sent to ${forgotEmail}. Valid for 5 minutes.` 
        });
        setForgotStep('otp');
      } else {
        setForgotMessage({ 
          type: 'error', 
          text: `❌ ${result.message}` 
        });
      }
    } catch (error) {
      setForgotMessage({ 
        type: 'error', 
        text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to send OTP'}` 
      });
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOTPVerification = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateOTP(forgotOTP)) {
      setForgotMessage({ type: 'error', text: '❌ Please enter a valid 6-digit OTP' });
      return;
    }

    if (forgotOTP === generatedOTP) {
      setForgotMessage({ type: 'success', text: '✅ OTP verified! Enter your new password.' });
      setTimeout(() => {
        setForgotStep('newpassword');
        setForgotMessage(null);
      }, 1500);
    } else {
      setForgotMessage({ type: 'error', text: '❌ Incorrect OTP. Please try again.' });
      setForgotOTP('');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      setForgotMessage({ type: 'error', text: '❌ Please enter a new password' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotMessage({ type: 'error', text: '❌ Passwords do not match' });
      return;
    }

    const passwordStrength = validatePasswordStrength(newPassword);
    if (!passwordStrength.isValid) {
      setForgotMessage({ 
        type: 'error', 
        text: `❌ ${passwordStrength.errors[0]}` 
      });
      return;
    }

    setResettingPassword(true);
    setForgotMessage(null);

    try {
      // Update password in Firebase
      const db = getDatabase();
      const passwordRef = ref(db, 'admin/config/password');
      const hashedPassword = hashPassword(newPassword);
      
      await set(passwordRef, {
        hash: hashedPassword,
        lastUpdated: new Date().toISOString(),
        email: forgotEmail
      });

      // update in local state so login uses latest
      setStoredPasswordHash(hashedPassword);

      setForgotMessage({ 
        type: 'success', 
        text: '✅ Password updated successfully! Redirecting to login...' 
      });

      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep('email');
        setForgotEmail('');
        setForgotOTP('');
        setNewPassword('');
        setConfirmPassword('');
        setGeneratedOTP('');
      }, 2000);
    } catch (error) {
      setForgotMessage({ 
        type: 'error', 
        text: `❌ Error updating password: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotStep('email');
    setForgotEmail('');
    setForgotOTP('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedOTP('');
    setForgotMessage(null);
  };

  // subscribe to password hash on mount so login always uses latest
  React.useEffect(() => {
    const db = getDatabase();
    const passwordRef = ref(db, 'admin/config/password');
    const listener = onValue(passwordRef, (snapshot) => {
      const val = snapshot.val();
      if (val && val.hash) {
        setStoredPasswordHash(val.hash);
      }
    });

    return () => {
      off(passwordRef);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#05050a] text-white overflow-hidden relative">
      
      {/* BACKGROUND IMAGE WITH GLASSMORPHISM */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://tse1.mm.bing.net/th/id/OIP.naInxXObx0E1JgYlca249gHaEA?pid=Api&P=0&h=180)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: isMobile ? 'scroll' : 'fixed', // Disable parallax on mobile for performance
          willChange: 'background-image',
          transform: 'translateZ(0)'
        }}
      />
      
      {/* GLASSMORPHISM OVERLAY - Multiple layers for depth */}
      <div 
        className={`absolute inset-0 z-[1] bg-black/60 ${!reduceEffects ? 'backdrop-blur-xl' : 'backdrop-blur-sm'}`}
        style={{ 
          willChange: 'contents',
          transform: 'translateZ(0)'
        }}
      />
      <div 
        className="absolute inset-0 z-[2] bg-gradient-to-br from-[#05050a]/40 via-transparent to-[#0a0a15]/40"
        style={{ transform: 'translateZ(0)' }}
      />
      
      {/* ANIMATED NEON BACKGROUND ORBS - Reduce on mobile */}
      {!reduceEffects && (
        <>
          <div 
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#ff007a] rounded-full blur-[150px] opacity-15 animate-pulse z-[3]"
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
          />
          <div 
            className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00d1ff] rounded-full blur-[150px] opacity-15 animate-pulse z-[3]"
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
          />
        </>
      )}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00ffa3] rounded-full blur-[150px] opacity-10 z-[3]"
        style={{ willChange: 'opacity', transform: 'translate3d(-50%, -50%, 0)' }}
      />

      {/* CONTENT */}
      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        
        {/* HEADER */}
        <div className="text-center mb-20 animate-in fade-in duration-500">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
            KNCET <span className="text-[#ff007a] drop-shadow-[0_0_30px_#ff007a]">ATTENDANCE</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 font-light tracking-[3px]">
            SMART MULTI-USER PORTAL SYSTEM
          </p>
          <div className="mt-4 inline-block px-6 py-2 bg-white/5 border border-[#00d1ff] rounded-full">
            <p className="text-sm text-[#00d1ff] tracking-widest">POWERED BY FIREBASE</p>
          </div>
        </div>

        {/* PORTAL SELECTION CARDS */}
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 mb-12">
          
          {/* STAFF PORTAL CARD */}
          <div
            onClick={handleStaffAccess}
            className="group relative cursor-pointer h-[400px] md:h-[500px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 rounded-[40px] border border-white/10 hover:border-[#ff007a]/50 transition-all duration-300 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff007a]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[40px]"></div>

            {/* Border Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#ff007a] to-[#00d1ff] opacity-0 group-hover:opacity-20 blur rounded-[40px] transition-all duration-500"></div>

            <div className="relative z-20 h-full flex flex-col justify-between">
              {/* Icon */}
              <div className="w-20 h-20 bg-[#ff007a]/20 border border-[#ff007a] rounded-2xl flex items-center justify-center group-hover:shadow-[0_0_30px_#ff007a] transition-all">
                <Shield className="w-10 h-10 text-[#ff007a]" />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter">STAFF PORTAL</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Admin access to attendance analytics, student management, and real-time reporting.
                </p>

                <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs">
                    <Lock className="w-4 h-4 text-[#ff007a]" />
                    <span className="text-gray-300">Password Protected</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Shield className="w-4 h-4 text-[#ff007a]" />
                    <span className="text-gray-300">Admin Dashboard</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <button className="w-full py-4 bg-gradient-to-r from-[#ff007a] to-[#ff1493] text-white rounded-xl font-black text-sm tracking-[2px] hover:shadow-[0_0_40px_#ff007a] transition-all active:scale-95 group-hover:shadow-[0_0_30px_#ff007a]">
                ACCESS STAFF PORTAL
              </button>
            </div>
          </div>

          {/* STUDENT PORTAL CARD */}
          <div
            onClick={onStudentClick}
            className="group relative cursor-pointer h-[400px] md:h-[500px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 rounded-[40px] border border-white/10 hover:border-[#00d1ff]/50 transition-all duration-300 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d1ff]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[40px]"></div>

            {/* Border Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] opacity-0 group-hover:opacity-20 blur rounded-[40px] transition-all duration-500"></div>

            <div className="relative z-20 h-full flex flex-col justify-between">
              {/* Icon */}
              <div className="w-20 h-20 bg-[#00d1ff]/20 border border-[#00d1ff] rounded-2xl flex items-center justify-center group-hover:shadow-[0_0_30px_#00d1ff] transition-all">
                <Users className="w-10 h-10 text-[#00d1ff]" />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter">STUDENT PORTAL</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Mark your attendance with photo verification using device camera.
                </p>

                <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs">
                    <Users className="w-4 h-4 text-[#00d1ff]" />
                    <span className="text-gray-300">Open Access</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Users className="w-4 h-4 text-[#00d1ff]" />
                    <span className="text-gray-300">Camera Integration</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <button className="w-full py-4 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-black text-sm tracking-[2px] hover:shadow-[0_0_40px_#00d1ff] transition-all active:scale-95 group-hover:shadow-[0_0_30px_#00d1ff]">
                ACCESS STUDENT PORTAL
              </button>
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div className="w-full max-w-5xl mt-16">
          <h3 className="text-center text-sm font-black tracking-[4px] text-gray-400 mb-8 uppercase">System Features</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: '📊', label: 'Analytics' },
              { icon: '🎥', label: 'Photo Verification' },
              { icon: '📧', label: 'Email Alerts' },
              { icon: '📥', label: 'Excel Export' }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="text-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all hover:bg-white/10"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <p className="text-xs font-bold text-gray-300 tracking-widest">{feature.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PASSWORD PROMPT MODAL */}
      {showPasswordPrompt && (
        <div
          className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPasswordPrompt(false)}
        >
          <div
            className="relative w-full max-w-md bg-black border-2 border-[#ff007a] rounded-[30px] overflow-hidden shadow-[0_0_50px_rgba(255,0,122,0.4)] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Neon Glow Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff007a]/20 to-[#00d1ff]/20 opacity-0"></div>

            {/* Content */}
            <div className="relative p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                  <Lock className="w-6 h-6 text-[#ff007a]" />
                  STAFF AUTHENTICATION
                </h2>
                <button
                  onClick={() => setShowPasswordPrompt(false)}
                  className="text-gray-400 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-6">Enter your staff password to access the admin dashboard.</p>

              {/* Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    autoFocus
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#ff007a] focus:outline-none transition-all focus:shadow-[0_0_20px_rgba(255,0,122,0.3)]"
                  />
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-xs font-bold text-center">
                    {passwordError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#ff007a] to-[#ff1493] text-white rounded-xl font-bold text-sm tracking-widest hover:shadow-[0_0_30px_#ff007a] transition-all active:scale-95"
                >
                  🔓 UNLOCK STAFF PORTAL
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(false)}
                  className="w-full py-3 bg-white/5 border border-white/20 text-white rounded-xl font-bold text-sm tracking-widest hover:bg-white/10 transition-all"
                >
                  CANCEL
                </button>

                {/* Forgot Password Link */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setShowForgotPassword(true);
                  }}
                  className="w-full py-2 text-sm text-[#00d1ff] hover:text-[#00ffa3] transition-all font-bold tracking-wide"
                >
                  🔑 Forgot Password?
                </button>
              </form>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-[10px] text-gray-500 text-center">
                  Only authorized staff members should access this portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div
          className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={resetForgotPassword}
        >
          <div
            className="relative w-full max-w-md bg-black border-2 border-[#00d1ff] rounded-[30px] overflow-hidden shadow-[0_0_50px_rgba(0,209,255,0.4)] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content */}
            <div className="relative p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                  <Key className="w-6 h-6 text-[#00d1ff]" />
                  PASSWORD RESET
                </h2>
                <button
                  onClick={resetForgotPassword}
                  className="text-gray-400 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Messages */}
              {forgotMessage && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${
                  forgotMessage.type === 'success'
                    ? 'bg-[#00ffa3]/10 border-[#00ffa3] text-[#00ffa3]'
                    : forgotMessage.type === 'error'
                    ? 'bg-red-500/10 border-red-500 text-red-400'
                    : 'bg-[#00d1ff]/10 border-[#00d1ff] text-[#00d1ff]'
                }`}>
                  {forgotMessage.text}
                </div>
              )}

              {/* STEP 1: EMAIL */}
              {forgotStep === 'email' && (
                <form onSubmit={handleForgotPasswordEmail} className="space-y-4">
                  <p className="text-gray-400 text-sm mb-4">Enter your registered staff email to receive a password reset OTP.</p>
                  <input
                    type="email"
                    placeholder="Staff Email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={sendingOTP}
                    className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm tracking-widest hover:shadow-[0_0_30px_#00d1ff] transition-all disabled:opacity-50"
                  >
                    {sendingOTP ? '📧 SENDING OTP...' : '📧 SEND OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForgotPassword}
                    className="w-full py-3 bg-white/5 border border-white/20 text-white rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                  >
                    CANCEL
                  </button>
                </form>
              )}

              {/* STEP 2: OTP VERIFICATION */}
              {forgotStep === 'otp' && (
                <form onSubmit={handleOTPVerification} className="space-y-4">
                  <p className="text-gray-400 text-sm mb-4">Enter the 6-digit OTP sent to your email.</p>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={forgotOTP}
                    onChange={(e) => setForgotOTP(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all text-center text-2xl font-bold tracking-[10px]"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 text-center">OTP expires in 5 minutes</p>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm tracking-widest hover:shadow-[0_0_30px_#00d1ff] transition-all"
                  >
                    ✓ VERIFY OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email');
                      setForgotOTP('');
                      setForgotMessage(null);
                    }}
                    className="w-full py-3 bg-white/5 border border-white/20 text-white rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                  >
                    ← BACK
                  </button>
                </form>
              )}

              {/* STEP 3: NEW PASSWORD */}
              {forgotStep === 'newpassword' && (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <p className="text-gray-400 text-sm mb-4">
                    <strong>Password Requirements:</strong><br/>
                    • At least 8 characters<br/>
                    • Uppercase letter (A-Z)<br/>
                    • Lowercase letter (a-z)<br/>
                    • Number (0-9)<br/>
                    • Special character (!@#$%^&*)
                  </p>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all"
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm tracking-widest hover:shadow-[0_0_30px_#00d1ff] transition-all disabled:opacity-50"
                  >
                    {resettingPassword ? '⏳ UPDATING...' : '🔐 UPDATE PASSWORD'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForgotPassword}
                    className="w-full py-3 bg-white/5 border border-white/20 text-white rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                  >
                    CANCEL
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ANIMATIONS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(4px);
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-in {
          opacity: 1;
        }
        .fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .duration-500 {
          animation-duration: 0.5s;
        }
      `}} />
    </div>
  );
};

export default LandingPage;
