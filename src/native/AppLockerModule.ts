// TypeScript interface for the AppLocker native module
import { NativeModules, Platform } from 'react-native';

const { AppLockerModule } = NativeModules;

export interface InstalledApp {
    packageName: string;
    label: string;
    icon: string; // Base64 encoded PNG
    isSystemApp: boolean;
}

interface AppLockerNativeModule {
    // Installed Apps
    getInstalledApps(): Promise<InstalledApp[]>;

    // Permissions
    checkOverlayPermission(): Promise<boolean>;
    requestOverlayPermission(): Promise<boolean>;
    checkAccessibilityPermission(): Promise<boolean>;
    openAccessibilitySettings(): Promise<boolean>;
    checkUsageStatsPermission(): Promise<boolean>;
    requestUsageStatsPermission(): Promise<boolean>;

    // Locked Apps
    setLockedApps(apps: string[]): Promise<boolean>;
    getLockedApps(): Promise<string[]>;

    // Session Management
    unlockApp(packageName: string, durationMs: number): Promise<boolean>;
    clearAllSessions(): Promise<boolean>;

    // Service Control
    startProtection(): Promise<boolean>;
    stopProtection(): Promise<boolean>;
    isProtectionActive(): Promise<boolean>;

    // Lock Screen Control
    closeLockScreen(): Promise<boolean>;
    goToHome(): Promise<boolean>;
}

// Fallback for development
const MockModule: AppLockerNativeModule = {
    getInstalledApps: async () => [],
    checkOverlayPermission: async () => false,
    requestOverlayPermission: async () => true,
    checkAccessibilityPermission: async () => false,
    openAccessibilitySettings: async () => true,
    checkUsageStatsPermission: async () => false,
    requestUsageStatsPermission: async () => true,
    setLockedApps: async () => true,
    getLockedApps: async () => [],
    unlockApp: async () => true,
    clearAllSessions: async () => true,
    startProtection: async () => true,
    stopProtection: async () => true,
    isProtectionActive: async () => false,
    closeLockScreen: async () => true,
    goToHome: async () => true,
};

export const AppLocker: AppLockerNativeModule =
    Platform.OS === 'android' && AppLockerModule
        ? AppLockerModule
        : MockModule;

export default AppLocker;
