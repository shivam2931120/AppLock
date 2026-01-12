// Secure Storage Layer using MMKV with encryption
import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import { createHash } from './keystore';

const ENCRYPTION_KEY_SERVICE = 'com.applock.encryption';
const MMKV_ID = 'applock-secure-storage';

let storage: MMKV | null = null;

// Storage keys
export const STORAGE_KEYS = {
    LOCKED_APPS: 'locked_apps',
    PIN_HASH: 'pin_hash',
    PATTERN_HASH: 'pattern_hash',
    AUTH_TYPE: 'auth_type', // 'pin' | 'pattern' | 'biometric'
    BIOMETRIC_ENABLED: 'biometric_enabled',
    SESSION_TIMEOUT: 'session_timeout',
    APP_SESSIONS: 'app_sessions',
    FIRST_LAUNCH: 'first_launch',
    THEME_MODE: 'theme_mode',
};

export type AuthType = 'pin' | 'pattern' | 'biometric';

// Initialize storage with encryption key from Keychain
export async function initializeStorage(): Promise<void> {
    try {
        // Try to get existing encryption key
        let encryptionKey = await getEncryptionKey();

        if (!encryptionKey) {
            // Generate a new random key
            encryptionKey = generateRandomKey();
            await saveEncryptionKey(encryptionKey);
        }

        storage = new MMKV({
            id: MMKV_ID,
            encryptionKey: encryptionKey,
        });

        // Mark first launch if needed
        if (!storage.contains(STORAGE_KEYS.FIRST_LAUNCH)) {
            storage.set(STORAGE_KEYS.FIRST_LAUNCH, false);
            storage.set(STORAGE_KEYS.AUTH_TYPE, 'pin');
            storage.set(STORAGE_KEYS.BIOMETRIC_ENABLED, false);
            storage.set(STORAGE_KEYS.SESSION_TIMEOUT, 30000); // 30 seconds default
            storage.set(STORAGE_KEYS.LOCKED_APPS, JSON.stringify([]));
        }
    } catch (error) {
        console.error('Failed to initialize storage:', error);
        // Fallback to unencrypted storage for development
        storage = new MMKV({ id: MMKV_ID });
    }
}

async function getEncryptionKey(): Promise<string | null> {
    try {
        const credentials = await Keychain.getGenericPassword({
            service: ENCRYPTION_KEY_SERVICE,
        });
        return credentials ? credentials.password : null;
    } catch (error) {
        console.error('Failed to get encryption key:', error);
        return null;
    }
}

async function saveEncryptionKey(key: string): Promise<void> {
    try {
        await Keychain.setGenericPassword('applock', key, {
            service: ENCRYPTION_KEY_SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        });
    } catch (error) {
        console.error('Failed to save encryption key:', error);
    }
}

function generateRandomKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// Helper to ensure storage is initialized
function getStorage(): MMKV {
    if (!storage) {
        throw new Error('Storage not initialized. Call initializeStorage() first.');
    }
    return storage;
}

// Locked Apps Management
export function getLockedApps(): string[] {
    try {
        const json = getStorage().getString(STORAGE_KEYS.LOCKED_APPS);
        return json ? JSON.parse(json) : [];
    } catch {
        return [];
    }
}

export function setLockedApps(apps: string[]): void {
    getStorage().set(STORAGE_KEYS.LOCKED_APPS, JSON.stringify(apps));
}

export function isAppLocked(packageName: string): boolean {
    return getLockedApps().includes(packageName);
}

export function toggleAppLock(packageName: string): boolean {
    const apps = getLockedApps();
    const index = apps.indexOf(packageName);

    if (index > -1) {
        apps.splice(index, 1);
        setLockedApps(apps);
        return false;
    } else {
        apps.push(packageName);
        setLockedApps(apps);
        return true;
    }
}

// PIN/Pattern Hash Management
export function setPINHash(pin: string): void {
    const hash = hashPIN(pin);
    getStorage().set(STORAGE_KEYS.PIN_HASH, hash);
    getStorage().set(STORAGE_KEYS.AUTH_TYPE, 'pin');
}

export function verifyPIN(pin: string): boolean {
    const storedHash = getStorage().getString(STORAGE_KEYS.PIN_HASH);
    if (!storedHash) return false;
    return hashPIN(pin) === storedHash;
}

export function hasPINSet(): boolean {
    return getStorage().contains(STORAGE_KEYS.PIN_HASH);
}

export function setPatternHash(pattern: number[]): void {
    const hash = hashPattern(pattern);
    getStorage().set(STORAGE_KEYS.PATTERN_HASH, hash);
    getStorage().set(STORAGE_KEYS.AUTH_TYPE, 'pattern');
}

export function verifyPattern(pattern: number[]): boolean {
    const storedHash = getStorage().getString(STORAGE_KEYS.PATTERN_HASH);
    if (!storedHash) return false;
    return hashPattern(pattern) === storedHash;
}

function hashPIN(pin: string): string {
    // Simple hash for demo - in production use proper crypto
    let hash = 0;
    const str = `applock_salt_${pin}_secure`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

function hashPattern(pattern: number[]): string {
    return hashPIN(pattern.join('-'));
}

// Auth Type
export function getAuthType(): AuthType {
    return (getStorage().getString(STORAGE_KEYS.AUTH_TYPE) as AuthType) || 'pin';
}

export function setAuthType(type: AuthType): void {
    getStorage().set(STORAGE_KEYS.AUTH_TYPE, type);
}

// Biometric
export function isBiometricEnabled(): boolean {
    return getStorage().getBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED) ?? false;
}

export function setBiometricEnabled(enabled: boolean): void {
    getStorage().set(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled);
}

// Session Management
export interface AppSession {
    packageName: string;
    unlockedAt: number;
    expiresAt: number;
}

export function getSessionTimeout(): number {
    return getStorage().getNumber(STORAGE_KEYS.SESSION_TIMEOUT) ?? 30000;
}

export function setSessionTimeout(timeout: number): void {
    getStorage().set(STORAGE_KEYS.SESSION_TIMEOUT, timeout);
}

export function getAppSessions(): AppSession[] {
    try {
        const json = getStorage().getString(STORAGE_KEYS.APP_SESSIONS);
        return json ? JSON.parse(json) : [];
    } catch {
        return [];
    }
}

export function setAppSession(packageName: string): void {
    const sessions = getAppSessions().filter(s => s.packageName !== packageName);
    const timeout = getSessionTimeout();
    const now = Date.now();

    sessions.push({
        packageName,
        unlockedAt: now,
        expiresAt: now + timeout,
    });

    getStorage().set(STORAGE_KEYS.APP_SESSIONS, JSON.stringify(sessions));
}

export function isSessionValid(packageName: string): boolean {
    const sessions = getAppSessions();
    const session = sessions.find(s => s.packageName === packageName);

    if (!session) return false;
    return Date.now() < session.expiresAt;
}

export function clearSession(packageName: string): void {
    const sessions = getAppSessions().filter(s => s.packageName !== packageName);
    getStorage().set(STORAGE_KEYS.APP_SESSIONS, JSON.stringify(sessions));
}

export function clearAllSessions(): void {
    getStorage().set(STORAGE_KEYS.APP_SESSIONS, JSON.stringify([]));
}

// First launch check
export function isFirstLaunch(): boolean {
    return !getStorage().getBoolean(STORAGE_KEYS.FIRST_LAUNCH);
}

export function setFirstLaunchComplete(): void {
    getStorage().set(STORAGE_KEYS.FIRST_LAUNCH, true);
}
