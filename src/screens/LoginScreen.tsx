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
import { useAuth, DEFAULT_ARJUN_AVATAR, DEFAULT_ANANYA_AVATAR } from '../context/AuthContext';
import { ALLOWED_PRIMARY_DOMAIN } from '../utils/domainAuth';

const STUDIO_HERO_IMAGE = '/src/assets/images/indian_fitness_studio_hero_1794490220381.jpg';

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

  const [emailInput, setEmailInput] = useState('arjun.nair@hbplus.fit');
  const [heroImgError, setHeroImgError] = useState(false);
  const [googleMailboxBridge, setGoogleMailboxBridge] = useState<string | null>('example@hbplus.fit');

  const handleEmailSignIn = async () => {
    const clean = emailInput.trim().toLowerCase();
    await authenticateWithEmailHandshake({
      email: clean,
      role: clean === 'example@hbplus.fit' || clean === 'arjun.nair@hbplus.fit' ? 'admin' : 'user',
    });
  };

  return (
    <SafeAreaView className="min-h-screen bg-[#F7F6F2] text-[#181816] flex flex-col">
      <View
        accessibilityRole="main"
        testID="login-screen"
        className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-screen items-stretch"
      >
        {/* Left Column: Indian Strength & Conditioning Studio Visual */}
        <div className="hidden lg:flex lg:col-span-6 relative overflow-hidden bg-[#181816] flex-col justify-between p-12 text-[#F7F6F2] animate-studio-hero">
          {!heroImgError && (
            <img
              src={STUDIO_HERO_IMAGE}
              alt="HB+ Strength and Conditioning Studio in Indiranagar, Bengaluru"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          )}
          {/* Measured Contrast Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181816] via-[#181816]/55 to-[#181816]/25" />

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
                className="w-7 h-7 rounded-md bg-[#F7F6F2] text-[#181816] flex items-center justify-center text-xs font-extrabold tracking-tight"
              >
                HB+
              </span>
              <span>HB+ Studio</span>
            </a>
            <span className="text-xs font-medium text-[#D5D2C8]">
              hbplus.fit
            </span>
          </div>

          {/* Bottom Grounded Editorial Statement & Indian Studio Locations */}
          <div className="relative z-10 space-y-6 max-w-lg animate-studio-stagger-2">
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-[#D5D2C8]">
                Bengaluru · Mumbai · New Delhi
              </div>
              <h2
                className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.14] font-display"
                style={{ textWrap: 'balance' }}
              >
                Strength, conditioning, and movement coaching built for long-term practice.
              </h2>
            </div>

            <div className="pt-5 border-t border-white/15 grid grid-cols-3 gap-6 text-xs">
              <div>
                <div className="text-base font-bold text-white">
                  Indiranagar
                </div>
                <div className="text-[#C4C0B4] mt-0.5">Bengaluru Main Floor</div>
              </div>
              <div>
                <div className="text-base font-bold text-white">
                  Bandra West
                </div>
                <div className="text-[#C4C0B4] mt-0.5">Mumbai Strength Lab</div>
              </div>
              <div>
                <div className="text-base font-bold text-white">
                  Vasant Vihar
                </div>
                <div className="text-[#C4C0B4] mt-0.5">Delhi Movement Studio</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Staff & Coach Sign-In Portal */}
        <div className="lg:col-span-6 bg-[#F7F6F2] border-l border-[#E6E4DD] flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#181816]">
              HB+ Coaching Workspace
            </div>
            <span className="text-xs font-medium text-[#78756C]">
              @{ALLOWED_PRIMARY_DOMAIN} domain required
            </span>
          </div>

          {/* Sign-In Form Container */}
          <div className="w-full max-w-[430px] mx-auto my-auto py-6 space-y-5 animate-studio-stagger-1">
            <div className="space-y-1.5">
              <Text
                accessibilityRole="header"
                headingLevel={1}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#181816] font-display"
              >
                Staff &amp; Coach Sign In
              </Text>
              <p className="text-sm text-[#57554E] leading-relaxed">
                Sign in with your <span className="font-semibold text-[#181816]">@{ALLOWED_PRIMARY_DOMAIN}</span> Google account to access today&apos;s floor schedule, member training blocks, and studio roster.
              </p>
            </div>

            {/* Animated Protected Route & Domain Restriction Alerts */}
            {routeInterceptionMessage && (
              <div className="animate-studio-alert">
                <View
                  accessibilityRole="alert"
                  testID="route-guard-alert"
                  className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] flex items-start gap-2.5 text-xs"
                >
                  <Lock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{routeInterceptionMessage}</span>
                </View>
              </div>
            )}

            {authError && (
              <div className="animate-studio-alert">
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
              </div>
            )}

            {/* Primary Google OAuth Button + HB+ Mailbox Bridge Selector */}
            <div className="space-y-2.5 bg-white border border-[#E6E4DD] rounded-xl p-4">
              <Pressable
                onPress={() => loginWithGooglePopup(googleMailboxBridge)}
                disabled={isAuthenticating}
                accessibilityLabel="Login with Google"
                accessibilityState={{ busy: isAuthenticating, disabled: isAuthenticating }}
                testID="google-login-button"
                className="w-full py-3 px-4 bg-[#181816] hover:bg-[#2E2D2A] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2.5"
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

              <div className="pt-1 flex items-center justify-between gap-2 text-xs text-[#57554E]">
                <label htmlFor="oauth-mailbox-select" className="text-[#78756C] shrink-0">
                  Google OAuth Mailbox:
                </label>
                <select
                  id="oauth-mailbox-select"
                  aria-label="Google OAuth Mailbox Mode"
                  value={googleMailboxBridge || 'strict_gmail'}
                  onChange={(e) =>
                    setGoogleMailboxBridge(
                      e.target.value === 'strict_gmail' ? null : e.target.value
                    )
                  }
                  className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-[#F7F6F2] border border-[#E6E4DD] rounded-md text-[#181816] font-medium truncate"
                >
                  <option value="example@hbplus.fit">
                    example@hbplus.fit (Admin — Arjun Nair)
                  </option>
                  <option value="ananya.iyer@hbplus.fit">
                    ananya.iyer@hbplus.fit (Coach — Ananya Iyer)
                  </option>
                  <option value="strict_gmail">
                    Raw @gmail.com Account (Test Domain Restriction)
                  </option>
                </select>
              </div>
            </div>

            {/* Official @hbplus.fit Test Mailboxes on this Device */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#78756C]">
                Pre-provisioned Google accounts for verification
              </div>

              <div className="bg-white border border-[#E6E4DD] rounded-xl divide-y divide-[#E6E4DD] overflow-hidden">
                <Pressable
                  onPress={() =>
                    authenticateWithEmailHandshake({
                      email: 'example@hbplus.fit',
                      displayName: 'Arjun Nair',
                      photoURL: DEFAULT_ARJUN_AVATAR,
                      role: 'admin',
                      department: 'Head of Strength & Conditioning · Indiranagar',
                    })
                  }
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue as Arjun Nair example@hbplus.fit"
                  testID="preset-hbplus-admin"
                  className="w-full p-3 hover:bg-[#F7F6F2] flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={DEFAULT_ARJUN_AVATAR}
                      alt="Arjun Nair"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#E6E4DD] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#181816] truncate">
                        Arjun Nair
                      </div>
                      <div className="text-xs text-[#57554E] truncate">
                        example@hbplus.fit
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#2C4A3E] font-semibold shrink-0">
                    Studio Admin
                  </span>
                </Pressable>

                <Pressable
                  onPress={() =>
                    authenticateWithEmailHandshake({
                      email: 'ananya.iyer@hbplus.fit',
                      displayName: 'Ananya Iyer',
                      photoURL: DEFAULT_ANANYA_AVATAR,
                      role: 'user',
                      department: 'Mobility & Movement Specialist · Indiranagar',
                    })
                  }
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue as Ananya Iyer ananya.iyer@hbplus.fit"
                  testID="preset-hbplus-coach"
                  className="w-full p-3 hover:bg-[#F7F6F2] flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={DEFAULT_ANANYA_AVATAR}
                      alt="Ananya Iyer"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#E6E4DD] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#181816] truncate">
                        Ananya Iyer
                      </div>
                      <div className="text-xs text-[#57554E] truncate">
                        ananya.iyer@hbplus.fit
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#57554E] font-medium shrink-0">
                    Coach
                  </span>
                </Pressable>

                <Pressable
                  onPress={() =>
                    authenticateWithEmailHandshake({
                      email: 'example@gmail.com',
                      displayName: 'Personal Gmail Account',
                      role: 'user',
                    })
                  }
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue as example@gmail.com"
                  testID="preset-gmail"
                  className="w-full p-3 hover:bg-[#F7F6F2] flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#F2F0EA] text-[#57554E] font-semibold text-xs flex items-center justify-center shrink-0">
                      G
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#181816] truncate">
                        Personal Google Account
                      </div>
                      <div className="text-xs text-[#57554E] truncate">
                        example@gmail.com
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#78756C] shrink-0">
                    External
                  </span>
                </Pressable>
              </div>
            </div>

            {/* Custom HB+ Email Address Input */}
            <div className="pt-1 space-y-2">
              <Text
                accessibilityRole="label"
                htmlFor="workspace-email-input"
                className="text-xs font-medium text-[#57554E] block"
              >
                Or enter any @{ALLOWED_PRIMARY_DOMAIN} or external email address
              </Text>
              <div className="flex items-center gap-2">
                <TextInput
                  id="workspace-email-input"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="rohan.deshmukh@hbplus.fit"
                  keyboardType="email-address"
                  accessibilityLabel="Google Account Email"
                  testID="custom-email-input"
                  onSubmitEditing={handleEmailSignIn}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                />
                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={isAuthenticating}
                  accessibilityLabel="Continue with email"
                  testID="verify-custom-email-btn"
                  className="px-4 py-2.5 bg-[#2C4A3E] hover:bg-[#21382F] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Pressable>
              </div>
            </div>
          </div>

          {/* Quiet Footer */}
          <div className="flex items-center justify-between text-xs text-[#78756C]">
            <span>HB+ Performance Pvt. Ltd.</span>
            <span>Bengaluru · Mumbai · New Delhi</span>
          </div>
        </div>
      </View>
    </SafeAreaView>
  );
};
