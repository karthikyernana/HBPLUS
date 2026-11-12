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
 * and email on the DashboardScreen, with persisted inline profile editing.
 */
export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateProfile }) => {
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.displayName);
  const [draftDept, setDraftDept] = useState(user.department);
  const [editError, setEditError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

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
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2600);
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
      className="bg-white border border-[#E6E4DD] rounded-xl p-5 sm:p-6 animate-studio-stagger-1"
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
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-[#E6E4DD] bg-[#F2F0EA]"
              />
            ) : (
              <div
                data-testid="user-profile-avatar-fallback"
                aria-label={`${user.displayName} initials avatar`}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#181816] text-[#F7F6F2] font-display font-bold text-lg flex items-center justify-center"
              >
                {initials}
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0">
            {!isEditing ? (
              <div key="profile-view" className="space-y-1 animate-studio-tab">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Text
                    accessibilityRole="header"
                    headingLevel={1}
                    testID="user-profile-display-name"
                    className="text-xl sm:text-2xl font-bold tracking-tight text-[#181816] font-display truncate"
                  >
                    {user.displayName}
                  </Text>
                  {savedNotice && (
                    <span className="text-xs font-medium text-[#2C4A3E] animate-studio-alert">
                      Saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-[#57554E]">
                  <Mail className="w-3.5 h-3.5 text-[#78756C] shrink-0" />
                  <span
                    data-testid="user-profile-email"
                    className="text-[#181816] font-medium truncate"
                  >
                    {user.email}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#78756C] pt-0.5">
                  <span className="text-[#2C4A3E] font-medium">
                    Google Workspace Verified
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{user.department}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    data-testid="current-role-indicator"
                    className="font-semibold text-[#181816]"
                  >
                    {user.role === 'admin' ? 'Studio Admin' : 'Coach'}
                  </span>
                </div>
              </div>
            ) : (
              <div key="profile-edit" className="space-y-3 max-w-md animate-studio-tab">
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
                      className="text-xs font-medium text-[#57554E] block mb-1"
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
                      className="w-full px-3 py-1.5 text-sm border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                    />
                  </div>
                  <div>
                    <Text
                      accessibilityRole="label"
                      htmlFor="edit-profile-dept"
                      className="text-xs font-medium text-[#57554E] block mb-1"
                    >
                      Role &amp; Location
                    </Text>
                    <TextInput
                      id="edit-profile-dept"
                      value={draftDept}
                      onChangeText={setDraftDept}
                      placeholder="Specialty · Location"
                      accessibilityLabel="Edit Department"
                      testID="edit-profile-dept-input"
                      className="w-full px-3 py-1.5 text-sm border border-[#D5D2C8] rounded-lg bg-white text-[#181816]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pressable
                    onPress={handleSave}
                    accessibilityLabel="Save Profile Changes"
                    testID="save-profile-btn"
                    className="px-3.5 py-1.5 bg-[#181816] hover:bg-[#2E2D2A] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Profile</span>
                  </Pressable>
                  <Pressable
                    onPress={handleCancel}
                    accessibilityLabel="Cancel Profile Edit"
                    className="px-3.5 py-1.5 bg-[#F2F0EA] hover:bg-[#E6E4DD] text-[#181816] text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
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
              className="px-3.5 py-2 text-xs font-medium text-[#181816] bg-[#F7F6F2] hover:bg-[#EDEBE4] border border-[#E6E4DD] rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 text-[#57554E]" />
              <span>Edit Profile</span>
            </Pressable>
          </div>
        )}
      </div>
    </View>
  );
};
