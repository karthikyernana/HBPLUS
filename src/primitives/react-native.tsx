import React from 'react';

/**
 * React Native for Web Cross-Platform Primitives Bridge (React 19 Compatible)
 * Allows shared application screens to import standard React Native components
 * (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `ActivityIndicator`,
 * `SafeAreaView`, `StyleSheet`, `Platform`) while rendering accessible semantic
 * HTML elements on Web (`<button>`, `<input>`, `<main>`, `<nav>`, `<section>`).
 */

export const Platform = {
  OS: 'web' as 'web' | 'ios' | 'android',
  Version: '19.0.1',
  select<T>(specifics: { web?: T; ios?: T; android?: T; default?: T }): T | undefined {
    if (this.OS in specifics && specifics[this.OS] !== undefined) {
      return specifics[this.OS];
    }
    return specifics.default;
  },
};

type StyleProp = React.CSSProperties | Record<string, unknown> | undefined | null | false;

function flattenStyles(style?: StyleProp | StyleProp[]): React.CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<React.CSSProperties>((acc, item) => {
      return { ...acc, ...flattenStyles(item) };
    }, {});
  }
  return style as React.CSSProperties;
}

export const StyleSheet = {
  create<T extends Record<string, React.CSSProperties>>(styles: T): T {
    return styles;
  },
  flatten: flattenStyles,
};

export interface ViewProps {
  children?: React.ReactNode;
  style?: StyleProp | StyleProp[];
  className?: string;
  accessibilityRole?: 'main' | 'navigation' | 'region' | 'header' | 'footer' | 'alert' | 'none';
  accessibilityLabel?: string;
  testID?: string;
  id?: string;
}

export const View: React.FC<ViewProps> = ({
  children,
  style,
  className = '',
  accessibilityRole,
  accessibilityLabel,
  testID,
  id,
}) => {
  const computedStyle = flattenStyles(style);
  const commonProps = {
    id,
    className: `flex flex-col box-border ${className}`.trim(),
    style: computedStyle,
    'aria-label': accessibilityLabel,
    'data-testid': testID,
  };

  if (accessibilityRole === 'main') {
    return <main {...commonProps}>{children}</main>;
  }
  if (accessibilityRole === 'navigation') {
    return <nav {...commonProps}>{children}</nav>;
  }
  if (accessibilityRole === 'header') {
    return <header {...commonProps}>{children}</header>;
  }
  if (accessibilityRole === 'footer') {
    return <footer {...commonProps}>{children}</footer>;
  }
  if (accessibilityRole === 'region') {
    return <section {...commonProps}>{children}</section>;
  }
  if (accessibilityRole === 'alert') {
    return (
      <div role="alert" aria-live="polite" {...commonProps}>
        {children}
      </div>
    );
  }

  return <div {...commonProps}>{children}</div>;
};

export const SafeAreaView: React.FC<ViewProps> = ({ children, className = '', ...rest }) => (
  <View className={`min-h-screen w-full ${className}`.trim()} {...rest}>
    {children}
  </View>
);

export interface TextProps {
  children?: React.ReactNode;
  style?: StyleProp | StyleProp[];
  className?: string;
  accessibilityRole?: 'header' | 'text' | 'label';
  headingLevel?: 1 | 2 | 3 | 4;
  numberOfLines?: number;
  testID?: string;
  htmlFor?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  style,
  className = '',
  accessibilityRole,
  headingLevel = 2,
  numberOfLines,
  testID,
  htmlFor,
}) => {
  const computedStyle = flattenStyles(style);
  const clampClass = numberOfLines === 1 ? 'truncate' : '';
  const combinedClass = `${clampClass} ${className}`.trim();

  if (accessibilityRole === 'header') {
    if (headingLevel === 1) {
      return (
        <h1 className={combinedClass} style={computedStyle} data-testid={testID}>
          {children}
        </h1>
      );
    }
    if (headingLevel === 3) {
      return (
        <h3 className={combinedClass} style={computedStyle} data-testid={testID}>
          {children}
        </h3>
      );
    }
    return (
      <h2 className={combinedClass} style={computedStyle} data-testid={testID}>
        {children}
      </h2>
    );
  }

  if (accessibilityRole === 'label') {
    return (
      <label htmlFor={htmlFor} className={combinedClass} style={computedStyle} data-testid={testID}>
        {children}
      </label>
    );
  }

  return (
    <span className={combinedClass} style={computedStyle} data-testid={testID}>
      {children}
    </span>
  );
};

export interface PressableProps {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp | StyleProp[];
  className?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'link';
  accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean };
  testID?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Pressable: React.FC<PressableProps> = ({
  children,
  onPress,
  disabled = false,
  style,
  className = '',
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
  type = 'button',
}) => {
  const computedStyle = flattenStyles(style);
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      role={accessibilityRole === 'tab' ? 'tab' : undefined}
      aria-selected={accessibilityRole === 'tab' ? accessibilityState?.selected : undefined}
      aria-busy={accessibilityState?.busy}
      aria-label={accessibilityLabel}
      data-testid={testID}
      style={computedStyle}
      className={`cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors duration-150 ${className}`.trim()}
    >
      {children}
    </button>
  );
};

export interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  style?: StyleProp | StyleProp[];
  className?: string;
  accessibilityLabel?: string;
  id?: string;
  testID?: string;
  onSubmitEditing?: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
  style,
  className = '',
  accessibilityLabel,
  id,
  testID,
  onSubmitEditing,
}) => {
  const computedStyle = flattenStyles(style);
  return (
    <input
      id={id}
      type={keyboardType === 'email-address' ? 'email' : 'text'}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSubmitEditing) {
          e.preventDefault();
          onSubmitEditing();
        }
      }}
      placeholder={placeholder}
      disabled={!editable}
      aria-label={accessibilityLabel}
      data-testid={testID}
      style={computedStyle}
      className={`focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors ${className}`.trim()}
    />
  );
};

export interface ScrollViewProps {
  children?: React.ReactNode;
  style?: StyleProp | StyleProp[];
  contentContainerStyle?: StyleProp | StyleProp[];
  className?: string;
}

export const ScrollView: React.FC<ScrollViewProps> = ({
  children,
  style,
  contentContainerStyle,
  className = '',
}) => {
  return (
    <div
      style={{ ...flattenStyles(style), ...flattenStyles(contentContainerStyle) }}
      className={`overflow-y-auto ${className}`.trim()}
    >
      {children}
    </div>
  );
};

export const ActivityIndicator: React.FC<{ size?: 'small' | 'large'; color?: string; className?: string }> = ({
  size = 'small',
  color = '#0d9488',
  className = '',
}) => {
  const dim = size === 'large' ? 24 : 16;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`animate-spin ${className}`.trim()}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};
