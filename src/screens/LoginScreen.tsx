import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  AlertTriangle,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useAuth, DEFAULT_ALEX_AVATAR, DEFAULT_PRIYA_AVATAR } from '../context/AuthContext';
import { ALLOWED_PRIMARY_DOMAIN } from '../utils/domainAuth';

const STUDIO_HERO_IMAGE = '/src/assets/images/hbplus_performance_studio_1794485847017.jpg';

export const LoginScreen: React.FC = () => {
  const {
    isAuthenticating,
    authError,
    rejectedEmailAttempt,
    routeInterceptionMessage,
    loginWithGooglePopup,
    authenticateWithEmailHandshake,
    clearMessages,
  } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [heroImgError, setHeroImgError] = useState(false);

  const handleEmailSignIn = async () => {
    await authenticateWithEmailHandshake({
      email: emailInput,
      role: emailInput.trim().toLowerCase() === 'example@hbplus.fit' ? 'admin' : 'user',
    });
  };

  return (
    <SafeAreaView className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col">
      <View
        accessibilityRole="main"
        testID="login-screen"
        className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-screen items-stretch"
      >
        {/* Left Column: Architectural Athletic Studio Visual */}
        <div className="hidden lg:flex lg:col-span-6 relative overflow-hidden bg-[#09090B] flex-col justify-between p-12 text-white">
          {!heroImgError && (
            <img
              src={STUDIO_HERO_IMAGE}
              alt="HB+ Athletic Performance Studio"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
          )}
          {/* Measured Contrast Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/60 to-[#09090B]/25" />

          {/* Top Brand Lockup */}
          <div className="relative z-10 flex items-center justify-between">
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                clearMessages();
              }}
              className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-white font-display whitespace-nowrap"
            >
              <span
                aria-hidden="true"
                className="w-7 h-7 rounded-md bg-white text-[#09090B] flex items-center justify-center text-xs font-extrabold tracking-tight"
              >
                HB+
              </span>
              <span>HB+ Studio</span>
            </a>
            <span className="text-xs font-medium text-[#A1A1AA]">
              hbplus.fit
            </span>
          </div>

          {/* Bottom Editorial Statement & Studio Metrics */}
          <div className="relative z-10 space-y-6 max-w-lg">
            <div className="space-y-3">
              <div className="text-xs font-medium text-[#D4D4D8]">
                Athletic Performance &amp; Biometric Coaching
              </div>
              <h2
                className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.12] font-display"
                style={{ textWrap: 'balance' }}
              >
                Precision coaching and daily readiness telemetry for high-output athletes.
              </h2>
            </div>

            <div className="pt-5 border-t border-white/15 grid grid-cols-3 gap-6 text-xs">
              <div>
                <div className="text-xl font-bold text-white tabular-nums">
                  420+
                </div>
                <div className="text-[#A1A1AA] mt-0.5">Active Athletes</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white tabular-nums">
                  98.4%
                </div>
                <div className="text-[#A1A1AA] mt-0.5">Readiness Sync</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white tabular-nums">
                  3 Labs
                </div>
                <div className="text-[#A1A1AA] mt-0.5">SF · LDN · BLR</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Staff & Coach Sign-In Portal */}
        <div className="lg:col-span-6 bg-white border-l border-[#E4E4E7] flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#09090B]">
              HB+ Performance Platform
            </div>
            <span className="text-xs font-medium text-[#71717A]">
              @{ALLOWED_PRIMARY_DOMAIN} workspace
            </span>
          </div>

          {/* Sign-In Form Container */}
          <div className="w-full max-w-[420px] mx-auto my-auto py-8 space-y-6">
            <div className="space-y-1.5">
              <Text
                accessibilityRole="header"
                headingLevel={1}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#09090B] font-display"
              >
                Coach &amp; Staff Sign In
              </Text>
              <p className="text-sm text-[#52525B] leading-relaxed">
                Sign in with your <span className="font-semibold text-[#09090B]">@{ALLOWED_PRIMARY_DOMAIN}</span> Google account to access athlete schedules, biometrics, and team permissions.
              </p>
            </div>

            {/* Protected Route Notice */}
            {routeInterceptionMessage && (
              <View
                accessibilityRole="alert"
                testID="route-guard-alert"
                className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] flex items-start gap-2.5 text-xs"
              >
                <Lock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{routeInterceptionMessage}</span>
              </View>
            )}

            {/* Domain Restriction Error Alert */}
            {authError && (
              <View
                accessibilityRole="alert"
                testID="auth-error-banner"
                className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#7F1D1D] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#991B1B]">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <span>Domain Restricted</span>
                  </div>
                  {rejectedEmailAttempt && (
                    <span className="text-xs font-medium text-[#B91C1C] truncate max-w-[180px]">
                      {rejectedEmailAttempt}
                    </span>
                  )}
                </div>
                <p
                  data-testid="auth-error-message"
                  className="text-sm font-medium text-[#7F1D1D] leading-snug"
                >
                  {authError}
                </p>
              </View>
            )}

            {/* Primary Google OAuth Button */}
            <Pressable
              onPress={loginWithGooglePopup}
              disabled={isAuthenticating}
              accessibilityLabel="Login with Google"
              accessibilityState={{ busy: isAuthenticating, disabled: isAuthenticating }}
              testID="google-login-button"
              className="w-full py-3 px-4 bg-[#09090B] hover:bg-[#27272A] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors"
            >
              {isAuthenticating ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <span className="whitespace-nowrap">Verifying Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 16c1.9 3.9 5.8 7 10.4 7z"
                    />
                  </svg>
                  <span className="whitespace-nowrap">Login with Google</span>
                </>
              )}
            </Pressable>

            {/* Saved Google Accounts on Device */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-medium text-[#71717A]">
                Recent Google accounts on this device
              </div>

              <div className="bg-white border border-[#E4E4E7] rounded-xl divide-y divide-[#E4E4E7] overflow-hidden">
                <Pressable
                  onPress={() =>
                    authenticateWithEmailHandshake({
                      email: 'example@hbplus.fit',
                      displayName: 'Alex Rivera',
                      photoURL: DEFAULT_ALEX_AVATAR,
                      role: 'admin',
                      department: 'Performance & Coaching Lead',
                    })
                  }
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue as Alex Rivera example@hbplus.fit"
                  testID="preset-hbplus-admin"
                  className="w-full p-3 hover:bg-[#FAFAFA] flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={DEFAULT_ALEX_AVATAR}
                      alt="Alex Rivera"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#E4E4E7] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#09090B] truncate">
                        Alex Rivera
                      </div>
                      <div className="text-xs text-[#52525B] truncate">
                        example@hbplus.fit
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#52525B] font-medium shrink-0">
                    Lead Admin
                  </span>
                </Pressable>

                <Pressable
                  onPress={() =>
                    authenticateWithEmailHandshake({
                      email: 'priya.sharma@hbplus.fit',
                      displayName: 'Priya Sharma',
                      photoURL: DEFAULT_PRIYA_AVATAR,
                      role: 'user',
                      department: 'Metabolic & Endurance Coach',
                    })
                  }
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue as Priya Sharma priya.sharma@hbplus.fit"
                  testID="preset-hbplus-coach"
                  className="w-full p-3 hover:bg-[#FAFAFA] flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={DEFAULT_PRIYA_AVATAR}
                      alt="Priya Sharma"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#E4E4E7] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#09090B] truncate">
                        Priya Sharma
                      </div>
                      <div className="text-xs text-[#52525B] truncate">
                        priya.sharma@hbplus.fit
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#52525B] font-medium shrink-0">
                    Coach
                  </span>
                </Pressable>

                <Pressable
                  onPress={() =>
                    authenticateWithEmailHandshake({
                      email: 'example@gmail.com',
                      displayName: 'Personal Account',
                      role: 'user',
                    })
                  }
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue as example@gmail.com"
                  testID="preset-gmail"
                  className="w-full p-3 hover:bg-[#FAFAFA] flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#F4F4F5] text-[#52525B] font-semibold text-xs flex items-center justify-center shrink-0">
                      G
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#09090B] truncate">
                        Personal Google Account
                      </div>
                      <div className="text-xs text-[#52525B] truncate">
                        example@gmail.com
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#71717A] shrink-0">
                    Personal
                  </span>
                </Pressable>
              </div>
            </div>

            {/* Custom Work Email Input */}
            <div className="pt-1 space-y-2">
              <Text
                accessibilityRole="label"
                htmlFor="workspace-email-input"
                className="text-xs font-medium text-[#52525B] block"
              >
                Or sign in with another Google Workspace address
              </Text>
              <div className="flex items-center gap-2">
                <TextInput
                  id="workspace-email-input"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="coach@hbplus.fit"
                  keyboardType="email-address"
                  accessibilityLabel="Google Account Email"
                  testID="custom-email-input"
                  onSubmitEditing={handleEmailSignIn}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                />
                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue with email"
                  testID="verify-custom-email-btn"
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Pressable>
              </div>
            </div>
          </div>

          {/* Quiet Footer */}
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span>HB+ Performance Inc.</span>
            <span>Staff &amp; Coaching Portal</span>
          </div>
        </div>
      </View>
    </SafeAreaView>
  );
};
