import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/theme';

interface AppCardProps {
    label: string;
    packageName: string;
    icon: string; // Base64
    isLocked: boolean;
    onToggle: () => void;
}

export const AppCard: React.FC<AppCardProps> = ({
    label,
    packageName,
    icon,
    isLocked,
    onToggle,
}) => {
    const iconUri = icon ? `data:image/png;base64,${icon}` : null;

    return (
        <TouchableOpacity
            style={[styles.container, isLocked && styles.containerLocked]}
            onPress={onToggle}
            activeOpacity={0.7}
        >
            {/* App Icon */}
            <View style={styles.iconContainer}>
                {iconUri ? (
                    <Image source={{ uri: iconUri }} style={styles.icon} />
                ) : (
                    <View style={styles.iconPlaceholder}>
                        <Text style={styles.iconPlaceholderText}>
                            {label.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Lock Badge */}
                {isLocked && (
                    <View style={styles.lockBadge}>
                        <Text style={styles.lockBadgeText}>🔒</Text>
                    </View>
                )}
            </View>

            {/* App Name */}
            <Text style={styles.label} numberOfLines={2}>
                {label}
            </Text>

            {/* Toggle Indicator */}
            <View style={[styles.toggle, isLocked && styles.toggleActive]}>
                <View style={[styles.toggleDot, isLocked && styles.toggleDotActive]} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '30%',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    containerLocked: {
        borderColor: colors.accentPrimary,
        ...shadows.card,
    },
    iconContainer: {
        position: 'relative',
        marginBottom: spacing.sm,
    },
    icon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
    },
    iconPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconPlaceholderText: {
        fontSize: typography.sizes.lg,
        fontWeight: 'bold',
        color: colors.textSecondary,
    },
    lockBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.accentPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockBadgeText: {
        fontSize: 10,
    },
    label: {
        fontSize: typography.sizes.xs,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
        height: 30,
    },
    toggle: {
        width: 40,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.bgTertiary,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleActive: {
        backgroundColor: colors.accentPrimary,
    },
    toggleDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.textSecondary,
    },
    toggleDotActive: {
        backgroundColor: colors.textPrimary,
        alignSelf: 'flex-end',
    },
});

export default AppCard;
