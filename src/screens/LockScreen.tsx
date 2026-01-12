import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { colors } from '../theme/theme';
import { PINOverlay } from '../components/PINOverlay';
import { PatternOverlay } from '../components/PatternOverlay';
import { AppLocker } from '../native/AppLockerModule';
import {
    verifyPIN,
    verifyPattern,
    getAuthType,
    setAppSession,
    getSessionTimeout,
    isBiometricEnabled,
} from '../storage/storage';
import ReactNativeBiometrics from 'react-native-biometrics';

interface LockScreenProps {
    lockedPackage?: string;
}

const rnBiometrics = new ReactNativeBiometrics();

export const LockScreen: React.FC<LockScreenProps> = ({ lockedPackage }) => {
    const [authType, setAuthType] = useState<'pin' | 'pattern'>('pin');
    const [showBiometric, setShowBiometric] = useState(false);

    useEffect(() => {
        // Load auth type preference
        const type = getAuthType();
        setAuthType(type === 'pattern' ? 'pattern' : 'pin');

        // Check if biometric is available and enabled
        checkBiometric();

        // Handle back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleCancel();
            return true;
        });

        return () => backHandler.remove();
    }, []);

    const checkBiometric = async () => {
        try {
            const { available } = await rnBiometrics.isSensorAvailable();
            setShowBiometric(available && isBiometricEnabled());
        } catch {
            setShowBiometric(false);
        }
    };

    const handleSuccess = async () => {
        if (lockedPackage) {
            const timeout = getSessionTimeout();
            await AppLocker.unlockApp(lockedPackage, timeout);
        }
        await AppLocker.closeLockScreen();
    };

    const handleCancel = async () => {
        await AppLocker.goToHome();
    };

    const handleBiometric = async () => {
        try {
            const { success } = await rnBiometrics.simplePrompt({
                promptMessage: 'Unlock with fingerprint',
            });

            if (success) {
                handleSuccess();
            }
        } catch (error) {
            console.error('Biometric failed:', error);
        }
    };

    const handleVerifyPIN = (pin: string): boolean => {
        return verifyPIN(pin);
    };

    const handleVerifyPattern = (pattern: number[]): boolean => {
        return verifyPattern(pattern);
    };

    return (
        <View style={styles.container}>
            {authType === 'pin' ? (
                <PINOverlay
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                    verifyPIN={handleVerifyPIN}
                    lockedAppName={lockedPackage}
                    showBiometric={showBiometric}
                    onBiometricPress={handleBiometric}
                />
            ) : (
                <PatternOverlay
                    onSuccess={handleSuccess}
                    verifyPattern={handleVerifyPattern}
                    lockedAppName={lockedPackage}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
});

export default LockScreen;
