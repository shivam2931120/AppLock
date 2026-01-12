import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Vibration,
    Dimensions,
    Animated,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme/theme';

interface PINOverlayProps {
    onSuccess: () => void;
    onCancel?: () => void;
    verifyPIN: (pin: string) => boolean;
    maxAttempts?: number;
    pinLength?: number;
    lockedAppName?: string;
    onBiometricPress?: () => void;
    showBiometric?: boolean;
}

const { width, height } = Dimensions.get('window');

export const PINOverlay: React.FC<PINOverlayProps> = ({
    onSuccess,
    onCancel,
    verifyPIN,
    maxAttempts = 5,
    pinLength = 4,
    lockedAppName,
    onBiometricPress,
    showBiometric = true,
}) => {
    const [pin, setPin] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState(false);
    const [shakeAnim] = useState(new Animated.Value(0));
    const [dotScaleAnims] = useState(
        Array.from({ length: pinLength }, () => new Animated.Value(1))
    );

    const shake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        Vibration.vibrate(200);
    }, [shakeAnim]);

    const animateDot = (index: number) => {
        Animated.sequence([
            Animated.timing(dotScaleAnims[index], {
                toValue: 1.3,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(dotScaleAnims[index], {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePress = (digit: string) => {
        if (pin.length >= pinLength) return;

        const newPin = pin + digit;
        setPin(newPin);
        setError(false);
        animateDot(pin.length);
        Vibration.vibrate(30);

        if (newPin.length === pinLength) {
            setTimeout(() => {
                if (verifyPIN(newPin)) {
                    onSuccess();
                } else {
                    setAttempts(prev => prev + 1);
                    setError(true);
                    shake();
                    setPin('');

                    if (attempts + 1 >= maxAttempts) {
                        // Lock out - could add cooldown logic here
                    }
                }
            }, 200);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
        Vibration.vibrate(30);
    };

    const renderDots = () => {
        return (
            <Animated.View
                style={[
                    styles.dotsContainer,
                    { transform: [{ translateX: shakeAnim }] }
                ]}
            >
                {Array.from({ length: pinLength }).map((_, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.dot,
                            pin.length > index && styles.dotFilled,
                            error && styles.dotError,
                            { transform: [{ scale: dotScaleAnims[index] }] }
                        ]}
                    />
                ))}
            </Animated.View>
        );
    };

    const renderKeypad = () => {
        const keys = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            [showBiometric ? 'bio' : '', '0', 'del'],
        ];

        return (
            <View style={styles.keypad}>
                {keys.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map((key, keyIndex) => {
                            if (key === '') {
                                return <View key={keyIndex} style={styles.keyPlaceholder} />;
                            }

                            if (key === 'bio') {
                                return (
                                    <TouchableOpacity
                                        key={keyIndex}
                                        style={styles.key}
                                        onPress={onBiometricPress}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.keyIcon}>🔐</Text>
                                    </TouchableOpacity>
                                );
                            }

                            if (key === 'del') {
                                return (
                                    <TouchableOpacity
                                        key={keyIndex}
                                        style={styles.key}
                                        onPress={handleBackspace}
                                        onLongPress={() => setPin('')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.keyIcon}>⌫</Text>
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <TouchableOpacity
                                    key={keyIndex}
                                    style={styles.key}
                                    onPress={() => handlePress(key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.keyText}>{key}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.lockIcon}>
                    <Text style={styles.lockEmoji}>🔒</Text>
                </View>
                <Text style={styles.title}>
                    {lockedAppName ? `Unlock ${lockedAppName}` : 'Enter PIN'}
                </Text>
                <Text style={styles.subtitle}>
                    {error
                        ? `Wrong PIN. ${maxAttempts - attempts} attempts left`
                        : 'Enter your PIN to continue'
                    }
                </Text>
            </View>

            {/* PIN Dots */}
            {renderDots()}

            {/* Keypad */}
            {renderKeypad()}

            {/* Cancel Button */}
            {onCancel && (
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    lockIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 2,
        borderColor: colors.accentPrimary,
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    lockEmoji: {
        fontSize: 36,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xxl,
    },
    dot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: colors.accentPrimary,
        borderColor: colors.accentPrimary,
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 5,
    },
    dotError: {
        borderColor: colors.error,
        backgroundColor: pin => pin ? colors.error : 'transparent',
    },
    keypad: {
        gap: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    key: {
        width: 75,
        height: 75,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    keyPlaceholder: {
        width: 75,
        height: 75,
    },
    keyText: {
        fontSize: typography.sizes.xxl,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    keyIcon: {
        fontSize: 24,
    },
    cancelButton: {
        marginTop: spacing.xxl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    cancelText: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
});

export default PINOverlay;
