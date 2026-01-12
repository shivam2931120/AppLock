import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/theme';
import { AppLocker } from '../native/AppLockerModule';

interface HomeScreenProps {
    onNavigateToApps: () => void;
    onNavigateToSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
    onNavigateToApps,
    onNavigateToSettings,
}) => {
    const [lockedAppsCount, setLockedAppsCount] = useState(0);
    const [isProtectionActive, setIsProtectionActive] = useState(false);
    const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
    const [hasAccessibilityPermission, setHasAccessibilityPermission] = useState(false);

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const loadStatus = async () => {
        try {
            const [lockedApps, protection, overlay, accessibility] = await Promise.all([
                AppLocker.getLockedApps(),
                AppLocker.isProtectionActive(),
                AppLocker.checkOverlayPermission(),
                AppLocker.checkAccessibilityPermission(),
            ]);

            setLockedAppsCount(lockedApps.length);
            setIsProtectionActive(protection);
            setHasOverlayPermission(overlay);
            setHasAccessibilityPermission(accessibility);
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    };

    const handlePermissionRequest = async (type: 'overlay' | 'accessibility') => {
        if (type === 'overlay') {
            await AppLocker.requestOverlayPermission();
        } else {
            await AppLocker.openAccessibilitySettings();
        }
    };

    const getProtectionStatus = () => {
        if (!hasOverlayPermission || !hasAccessibilityPermission) {
            return { status: 'setup', color: colors.warning, icon: '⚙️' };
        }
        if (isProtectionActive) {
            return { status: 'active', color: colors.success, icon: '🛡️' };
        }
        return { status: 'inactive', color: colors.error, icon: '⚠️' };
    };

    const protectionStatus = getProtectionStatus();

    const PermissionCard = ({
        icon,
        title,
        granted,
        onRequest,
    }: {
        icon: string;
        title: string;
        granted: boolean;
        onRequest: () => void;
    }) => (
        <TouchableOpacity
            style={[styles.permissionCard, granted && styles.permissionCardGranted]}
            onPress={onRequest}
            disabled={granted}
        >
            <Text style={styles.permissionIcon}>{icon}</Text>
            <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>{title}</Text>
                <Text style={[styles.permissionStatus, granted && styles.permissionStatusGranted]}>
                    {granted ? '✓ Granted' : 'Tap to enable'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🔐</Text>
                    <Text style={styles.title}>AppLock</Text>
                    <Text style={styles.subtitle}>Protect your privacy</Text>
                </View>

                {/* Status Card */}
                <View style={[styles.statusCard, { borderColor: protectionStatus.color }]}>
                    <Text style={styles.statusIcon}>{protectionStatus.icon}</Text>
                    <View style={styles.statusContent}>
                        <Text style={styles.statusTitle}>
                            {protectionStatus.status === 'active' && 'Protection Active'}
                            {protectionStatus.status === 'inactive' && 'Protection Inactive'}
                            {protectionStatus.status === 'setup' && 'Setup Required'}
                        </Text>
                        <Text style={styles.statusSubtitle}>
                            {lockedAppsCount} app{lockedAppsCount !== 1 ? 's' : ''} protected
                        </Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: protectionStatus.color }]} />
                </View>

                {/* Permissions Section */}
                {(!hasOverlayPermission || !hasAccessibilityPermission) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Required Permissions</Text>

                        <PermissionCard
                            icon="📱"
                            title="Display Over Apps"
                            granted={hasOverlayPermission}
                            onRequest={() => handlePermissionRequest('overlay')}
                        />

                        <PermissionCard
                            icon="♿"
                            title="Accessibility Service"
                            granted={hasAccessibilityPermission}
                            onRequest={() => handlePermissionRequest('accessibility')}
                        />
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={onNavigateToApps}
                        >
                            <View style={styles.actionIconContainer}>
                                <Text style={styles.actionIcon}>📱</Text>
                            </View>
                            <Text style={styles.actionTitle}>Lock Apps</Text>
                            <Text style={styles.actionSubtitle}>
                                {lockedAppsCount} locked
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={onNavigateToSettings}
                        >
                            <View style={styles.actionIconContainer}>
                                <Text style={styles.actionIcon}>⚙️</Text>
                            </View>
                            <Text style={styles.actionTitle}>Settings</Text>
                            <Text style={styles.actionSubtitle}>Configure</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tips */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tips</Text>
                    <View style={styles.tipCard}>
                        <Text style={styles.tipIcon}>💡</Text>
                        <Text style={styles.tipText}>
                            For best protection, grant all permissions and keep the app running.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    content: {
        padding: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        paddingTop: spacing.lg,
    },
    logo: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.sizes.hero,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 2,
        ...shadows.card,
    },
    statusIcon: {
        fontSize: 40,
        marginRight: spacing.md,
    },
    statusContent: {
        flex: 1,
    },
    statusTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    statusSubtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    statusDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 5,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
        color: colors.accentPrimary,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    permissionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    permissionCardGranted: {
        borderColor: colors.success,
        opacity: 0.8,
    },
    permissionIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    permissionContent: {
        flex: 1,
    },
    permissionTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    permissionStatus: {
        fontSize: typography.sizes.sm,
        color: colors.accentPrimary,
        marginTop: 2,
    },
    permissionStatusGranted: {
        color: colors.success,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    actionCard: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.accentPrimary,
    },
    actionIcon: {
        fontSize: 28,
    },
    actionTitle: {
        fontSize: typography.sizes.md,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    actionSubtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.accentPrimary,
    },
    tipIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    tipText: {
        flex: 1,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});

export default HomeScreen;
