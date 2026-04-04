import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Colors, BorderRadius, FontSizes, FontWeights, Shadows, Spacing } from '../../theme';

// ─── Gradient Card ───────────────────────────────────────────────────────────
interface GradientCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'primary' | 'surface' | 'elevated';
}

export function GradientCard({ children, style, variant = 'surface' }: GradientCardProps) {
    const bgColor =
        variant === 'primary'
            ? Colors.primary
            : variant === 'elevated'
                ? Colors.surfaceElevated
                : Colors.surface;

    return (
        <View
            style={[
                styles.gradientCard,
                { backgroundColor: bgColor },
                variant === 'primary' && Shadows.glow,
                style,
            ]}>
            {children}
        </View>
    );
}

// ─── Glass Card ──────────────────────────────────────────────────────────────
interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
}

export function GlassCard({ children, style, onPress }: GlassCardProps) {
    if (onPress) {
        return (
            <TouchableOpacity
                style={[styles.glassCard, style]}
                activeOpacity={0.85}
                onPress={onPress}>
                {children}
            </TouchableOpacity>
        );
    }
    return (
        <View style={[styles.glassCard, style]}>
            {children}
        </View>
    );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
    text: string;
    color?: string;
    bgColor?: string;
    size?: 'sm' | 'md';
}

export function Badge({ text, color = Colors.primary, bgColor, size = 'sm' }: BadgeProps) {
    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: bgColor || `${color}20` },
                size === 'md' && { paddingHorizontal: 14, paddingVertical: 6 },
            ]}>
            <Text
                style={[
                    styles.badgeText,
                    { color },
                    size === 'md' && { fontSize: FontSizes.sm },
                ]}>
                {text}
            </Text>
        </View>
    );
}

// ─── IconButton ──────────────────────────────────────────────────────────────
interface IconButtonProps {
    icon: string;
    onPress: () => void;
    size?: number;
    style?: ViewStyle;
    color?: string;
}

export function IconButton({ icon, onPress, size = 44, style, color }: IconButtonProps) {
    return (
        <TouchableOpacity
            style={[
                styles.iconButton,
                { width: size, height: size, borderRadius: size / 2 },
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.7}>
            <Text style={[styles.iconButtonText, color ? { color } : undefined]}>{icon}</Text>
        </TouchableOpacity>
    );
}

// ─── PrimaryButton ──────────────────────────────────────────────────────────
interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    style?: ViewStyle;
}

export function PrimaryButton({
    title,
    onPress,
    loading,
    disabled,
    variant = 'primary',
    size = 'lg',
    icon,
    style,
}: PrimaryButtonProps) {
    const isPrimary = variant === 'primary';
    const isGhost = variant === 'ghost';
    const isDanger = variant === 'danger';

    return (
        <TouchableOpacity
            style={[
                styles.primaryButton,
                isPrimary && styles.primaryButtonPrimary,
                isGhost && styles.primaryButtonGhost,
                isDanger && styles.primaryButtonDanger,
                variant === 'secondary' && styles.primaryButtonSecondary,
                size === 'sm' && { paddingVertical: 10, paddingHorizontal: 16 },
                size === 'md' && { paddingVertical: 14 },
                (disabled || loading) && { opacity: 0.5 },
                isPrimary && Shadows.lg,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}>
            {loading ? (
                <ActivityIndicator
                    color={isPrimary || isDanger ? '#fff' : Colors.primary}
                    size="small"
                />
            ) : (
                <View style={styles.buttonContent}>
                    {icon && (
                        typeof icon === 'string' ? <Text style={styles.buttonIcon}>{icon}</Text> : <View style={styles.buttonIconContainer}>{icon}</View>
                    )}
                    <Text
                        style={[
                            styles.primaryButtonText,
                            isPrimary && { color: '#fff' },
                            isGhost && { color: Colors.primary },
                            isDanger && { color: '#fff' },
                            variant === 'secondary' && { color: Colors.primary },
                            size === 'sm' && { fontSize: FontSizes.sm },
                        ]}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── SectionHeader ──────────────────────────────────────────────────────────
interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: string;
    onAction?: () => void;
}

export function SectionHeader({ title, subtitle, action, onAction }: SectionHeaderProps) {
    return (
        <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
            </View>
            {action && (
                <TouchableOpacity onPress={onAction}>
                    <Text style={styles.sectionAction}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Chip ────────────────────────────────────────────────────────────────────
interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    style?: ViewStyle;
}

export function Chip({ label, selected, onPress, style }: ChipProps) {
    return (
        <TouchableOpacity
            style={[
                styles.chip,
                selected && styles.chipSelected,
                selected && Shadows.sm,
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.7}>
            <Text
                style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
    return <View style={[styles.divider, style]} />;
}

// ─── Shimmer Placeholder ─────────────────────────────────────────────────────
interface ShimmerProps {
    width?: number | string;
    height: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function ShimmerPlaceholder({
    width = '100%',
    height,
    borderRadius = 8,
    style,
}: ShimmerProps) {
    return (
        <View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: Colors.shimmer,
                },
                style,
            ]}
        />
    );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
    icon: string;
    title: string;
    subtitle: string;
    actionText?: string;
    onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionText, onAction }: EmptyStateProps) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 48 }}>{icon}</Text>
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
            {actionText && onAction && (
                <PrimaryButton
                    title={actionText}
                    onPress={onAction}
                    size="sm"
                    style={{ marginTop: Spacing.lg }}
                />
            )}
        </View>
    );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
}

export function StatCard({ label, value, icon, color = Colors.primary }: StatCardProps) {
    return (
        <View style={styles.statCard}>
            {icon && (
                <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                    {typeof icon === 'string' ? <Text style={{ fontSize: 20 }}>{icon}</Text> : icon}
                </View>
            )}
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
import { TextInput, TextInputProps } from 'react-native';

interface InputFieldProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerStyle?: ViewStyle;
}

export function InputField({
    label,
    error,
    icon,
    containerStyle,
    style: inputStyle,
    ...props
}: InputFieldProps) {
    return (
        <View style={[{ marginBottom: Spacing.xl }, containerStyle]}>
            {label && <Text style={styles.inputLabel}>{label}</Text>}
            <View style={[styles.inputContainer, error ? styles.inputError : undefined]}>
                {icon && (
                    typeof icon === 'string' ? <Text style={styles.inputIcon}>{icon}</Text> : <View style={styles.inputIconContainer}>{icon}</View>
                )}
                <TextInput
                    style={[styles.input, inputStyle as TextStyle]}
                    placeholderTextColor={Colors.textTertiary}
                    {...props}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    gradientCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    glassCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    badge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    badgeText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    iconButton: {
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconButtonText: {
        fontSize: 18,
        color: Colors.textPrimary,
    },
    primaryButton: {
        borderRadius: BorderRadius.full, // M3 Buttons are highly rounded
        paddingVertical: 14,             // Thinner padding per M3 spec
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonPrimary: {
        backgroundColor: Colors.primary,
    },
    primaryButtonGhost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    primaryButtonDanger: {
        backgroundColor: Colors.error,
    },
    primaryButtonSecondary: {
        backgroundColor: Colors.primaryGhost,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonIcon: {
        fontSize: 18,
    },
    buttonIconContainer: {
        marginRight: 2,
    },
    primaryButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
        textTransform: 'uppercase', // M3 style
        letterSpacing: 0.5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    sectionSubtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    sectionAction: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    chip: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.textSecondary,
    },
    chipTextSelected: {
        color: '#fff',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing['5xl'],
        paddingHorizontal: Spacing['3xl'],
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    emptyTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.lg,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    statValue: {
        fontSize: FontSizes['2xl'],
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputLabel: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary, // Label-m3 uses darker contrast
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1.0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface, // Container-low equivalent
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.outlineVariant,
        paddingHorizontal: Spacing.lg,
    },
    inputError: {
        borderColor: Colors.error,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: Spacing.md,
    },
    inputIconContainer: {
        marginRight: Spacing.md,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    errorText: {
        fontSize: FontSizes.xs,
        color: Colors.error,
        marginTop: Spacing.xs,
        marginLeft: Spacing.xs,
    },
});
