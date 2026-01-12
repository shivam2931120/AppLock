import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Switch,
    Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/theme';
import { AppLocker } from '../native/AppLockerModule';
import ReactNativeBiometrics from 'react-native-biometrics';
import {
    isBiometricEnabled,
    setBiometricEnabled,
    getSessionTimeout,
    setSessionTimeout,
    clearAllSessions,
    setFirstLaunchComplete,
} from '../storage/storage';

interface SettingsProps {
    onBack?: () => void;
    onChangePIN?: () => void;
    onChangePattern?: () => void;
}

const rnBiometrics = new ReactNativeBiometrics();

export const Settings: React.FC<SettingsProps> = ({
    onBack,
    onChangePIN,
    onChangePattern,
}) => {
    const [biometricEnabled, setBiometricState] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [sessionDuration, setSessionDuration] = useState(30);
    const [protectionActive, setProtectionActive] = useState(false);

    useEffect(() => {
        checkBiometrics();
        loadSettings();
        checkProtection();
    }, []);

    const checkBiometrics = async () => {
        try {
            const { available } = await rnBiometrics.isSensorAvailable();
            setBiometricAvailable(available);
            setBiometricState(isBiometricEnabled());
        } catch (error) {
            console.error('Biometric check failed:', error);
        }
    };

    const loadSettings = () => {
        setSessionDuration(getSessionTimeout() / 1000);
    };

    const checkProtection = async () => {
        const active = await AppLocker.isProtectionActive();
        setProtectionActive(active);
    };

    const toggleBiometric = async (value: boolean) => {
        if (value) {
            try {
                const { success } = await rnBiometrics.simplePrompt({
                    promptMessage: 'Confirm fingerprint to enable',
                });
                if (success) {
                    setBiometricEnabled(true);
                    setBiometricState(true);
                }
            } catch (error) {
                console.error('Biometric enrollment failed:', error);
            }
        } else {
            setBiometricEnabled(false);
            setBiometricState(false);
        }
    };

    const handleSessionDurationChange = (seconds: number) => {
        setSessionDuration(seconds);
        setSessionTimeout(seconds * 1000);
    };

    const handleClearSessions = () => {
        Alert.alert(
            'Clear All Sessions',
            'This will require re-authentication for all locked apps.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        clearAllSessions();
                        Alert.alert('Done', 'All sessions cleared');
                    },
                },
            ]
        );
    };

    const openOverlaySettings = () => AppLocker.requestOverlayPermission();
    const openAccessibilitySettings = () => AppLocker.openAccessibilitySettings();

    const SettingRow = ({
        icon,
        title,
        subtitle,
        right
    }: {
        icon: string;
        title: string;
        subtitle?: string;
        right?: React.ReactNode;
    }) => (
        <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>{icon}</Text>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {right}
        </View>
    );

    const SettingButton = ({
        icon,
        title,
        subtitle,
        onPress,
        danger = false,
    }: {
        icon: string;
        title: string;
        subtitle?: string;
        onPress: () => void;
        danger?: boolean;
    }) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress}>
            <Text style={styles.settingIcon}>{icon}</Text>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>Settings</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Protection Status */}
                <View style={styles.section}>
                    <View style={[styles.statusCard, protectionActive && styles.statusCardActive]}>
                        <Text style={styles.statusIcon}>{protectionActive ? '🛡️' : '⚠️'}</Text>
                        <View style={styles.statusContent}>
                            <Text style={styles.statusTitle}>
                                {protectionActive ? 'Protection Active' : 'Protection Inactive'}
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                {protectionActive
                                    ? 'Your apps are being monitored'
                                    : 'Enable accessibility service to protect apps'
                                }
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Authentication */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Authentication</Text>

                    <SettingButton
                        icon="🔢"
                        title="Change PIN"
                        subtitle="Update your unlock PIN"
                        onPress={onChangePIN || (() => { })}
                    />

                    <SettingButton
                        icon="✋"
                        title="Change Pattern"
                        subtitle="Update your unlock pattern"
                        onPress={onChangePattern || (() => { })}
                    />

                    {biometricAvailable && (
                        <SettingRow
                            icon="👆"
                            title="Fingerprint Unlock"
                            subtitle="Use biometrics to unlock apps"
                            right={
                                <Switch
                                    value={biometricEnabled}
                                    onValueChange={toggleBiometric}
                                    trackColor={{ false: colors.bgTertiary, true: colors.accentSecondary }}
                                    thumbColor={biometricEnabled ? colors.accentPrimary : colors.textSecondary}
                                />
                            }
                        />
                    )}
                </View>

                {/* Session */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Session</Text>

                    <Text style={styles.sessionLabel}>
                        Unlock Duration: {sessionDuration} seconds
                    </Text>
                    <View style={styles.durationOptions}>
                        {[10, 30, 60, 120, 300].map(sec => (
                            <TouchableOpacity
                                key={sec}
                                style={[
                                    styles.durationButton,
                                    sessionDuration === sec && styles.durationButtonActive,
                                ]}
                                onPress={() => handleSessionDurationChange(sec)}
                            >
                                <Text style={[
                                    styles.durationText,
                                    sessionDuration === sec && styles.durationTextActive,
                                ]}>
                                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <SettingButton
                        icon="🔄"
                        title="Clear All Sessions"
                        subtitle="Re-lock all currently unlocked apps"
                        onPress={handleClearSessions}
                    />
                </View>

                {/* Permissions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Permissions</Text>

                    <SettingButton
                        icon="📱"
                        title="Overlay Permission"
                        subtitle="Required to show lock screen"
                        onPress={openOverlaySettings}
                    />

                    <SettingButton
                        icon="♿"
                        title="Accessibility Service"
                        subtitle="Required to detect app launches"
                        onPress={openAccessibilitySettings}
                    />
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>

                    <SettingRow
                        icon="ℹ️"
                        title="AppLock"
                        subtitle="Version 1.0.0"
                    />
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    backButton: {
        marginBottom: spacing.sm,
    },
    backButtonText: {
        fontSize: typography.sizes.xl,
        color: colors.accentPrimary,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
        color: colors.accentPrimary,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    statusCardActive: {
        borderColor: colors.success,
        ...shadows.card,
    },
    statusIcon: {
        fontSize: 32,
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
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    settingIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
    },
    settingSubtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    chevron: {
        fontSize: 24,
        color: colors.textSecondary,
    },
    dangerText: {
        color: colors.error,
    },
    sessionLabel: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    durationOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    durationButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    durationButtonActive: {
        backgroundColor: colors.accentPrimary,
        borderColor: colors.accentPrimary,
    },
    durationText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    durationTextActive: {
        color: colors.textPrimary,
        fontWeight: 'bold',
    },
    bottomPadding: {
        height: spacing.xxl,
    },
});

export default Settings;
