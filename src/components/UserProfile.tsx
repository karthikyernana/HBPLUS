import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Mail, Check, Pencil, X } from 'lucide-react';
import { UserProfileRecord } from '../utils/domainAuth';

export interface UserProfileProps {
  user: UserProfileRecord;
  onUpdateProfile?: (updates: { displayName: string; department: string }) => void;
}

/**
 * Displays the authenticated user's Google account avatar, display name,
 * and email on the DashboardScreen, with inline profile editing.
 */
export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateProfile }) => {
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.displayName);
  const [draftDept, setDraftDept] = useState(user.department);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(user.displayName);
    setDraftDept(user.department);
    setImgError(false);
  }, [user.uid, user.displayName, user.department, user.photoURL]);

  const initials = (user.displayName || user.email || 'HB')
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const handleSave = () => {
    const trimmedName = draftName.trim();
    const trimmedDept = draftDept.trim();
    if (!trimmedName || !trimmedDept) {
      setEditError('Display name and specialty are required.');
      return;
    }
    setEditError(null);
    onUpdateProfile?.({
      displayName: trimmedName,
      department: trimmedDept,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftName(user.displayName);
    setDraftDept(user.department);
    setEditError(null);
    setIsEditing(false);
  };

  return (
    <View
      accessibilityRole="region"
      accessibilityLabel="Authenticated Google User Profile"
      testID="user-profile-card"
      className="bg-white border border-[#E4E4E7] rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        {/* Left: Google Account Avatar + Display Name + Official Domain Email */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user.photoURL && !imgError ? (
              <img
                src={user.photoURL}
                alt={`${user.displayName} avatar`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                data-testid="user-profile-avatar"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-[#E4E4E7] bg-[#F4F4F5]"
              />
            ) : (
              <div
                data-testid="user-profile-avatar-fallback"
                aria-label={`${user.displayName} initials avatar`}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#09090B] text-white font-display font-bold text-lg flex items-center justify-center"
              >
                {initials}
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0">
            {!isEditing ? (
              <>
                <Text
                  accessibilityRole="header"
                  headingLevel={1}
                  testID="user-profile-display-name"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-[#09090B] font-display truncate"
                >
                  {user.displayName}
                </Text>

                <div className="flex items-center gap-2 text-sm text-[#52525B]">
                  <Mail className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                  <span
                    data-testid="user-profile-email"
                    className="text-[#18181B] font-medium truncate"
                  >
                    {user.email}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717A] pt-0.5">
                  <span className="text-[#15803D] font-medium">
                    Google Workspace Connected
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{user.department}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    data-testid="current-role-indicator"
                    className="font-semibold text-[#09090B]"
                  >
                    {user.role === 'admin' ? 'Admin' : 'Coach'}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-3 max-w-md">
                {editError && (
                  <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                    {editError}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="edit-profile-name"
                      className="text-xs font-medium text-[#52525B] block mb-1"
                    >
                      Display Name
                    </Text>
                    <TextInput
                      id="edit-profile-name"
                      value={draftName}
                      onChangeText={setDraftName}
                      placeholder="Full Name"
                      accessibilityLabel="Edit Display Name"
                      testID="edit-profile-name-input"
                      className="w-full px-3 py-1.5 text-sm border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                    />
                  </div>
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="edit-profile-dept"
                      className="text-xs font-medium text-[#52525B] block mb-1"
                    >
                      Specialty / Department
                    </Text>
                    <TextInput
                      id="edit-profile-dept"
                      value={draftDept}
                      onChangeText={setDraftDept}
                      placeholder="Specialty"
                      accessibilityLabel="Edit Department"
                      testID="edit-profile-dept-input"
                      className="w-full px-3 py-1.5 text-sm border border-[#D4D4D8] rounded-lg bg-white text-[#09090B]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pressable
                    onPress={handleSave}
                    accessibilityLabel="Save Profile Changes"
                    testID="save-profile-btn"
                    className="px-3.5 py-1.5 bg-[#09090B] hover:bg-[#27272A] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Profile</span>
                  </Pressable>
                  <Pressable
                    onPress={handleCancel}
                    accessibilityLabel="Cancel Profile Edit"
                    className="px-3.5 py-1.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#09090B] text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </Pressable>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Edit Profile Action */}
        {onUpdateProfile && !isEditing && (
          <div className="flex items-center shrink-0">
            <Pressable
              onPress={() => {
                setDraftName(user.displayName);
                setDraftDept(user.department);
                setEditError(null);
                setIsEditing(true);
              }}
              accessibilityLabel="Edit Profile"
              testID="edit-profile-btn"
              className="px-3.5 py-2 text-xs font-medium text-[#09090B] bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 text-[#52525B]" />
              <span>Edit Profile</span>
            </Pressable>
          </div>
        )}
      </div>
    </View>
  );
};
