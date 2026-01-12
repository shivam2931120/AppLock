import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Vibration,
    Dimensions,
    Animated,
    PanResponder,
    GestureResponderEvent,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme/theme';

interface PatternOverlayProps {
    onSuccess: () => void;
    onCancel?: () => void;
    verifyPattern: (pattern: number[]) => boolean;
    maxAttempts?: number;
    lockedAppName?: string;
}

const { width } = Dimensions.get('window');
const GRID_SIZE = 3;
const DOT_SIZE = 24;
const DOT_SPACING = (width - 100) / GRID_SIZE;

interface Point {
    x: number;
    y: number;
    index: number;
}

export const PatternOverlay: React.FC<PatternOverlayProps> = ({
    onSuccess,
    verifyPattern,
    maxAttempts = 5,
    lockedAppName,
}) => {
    const [pattern, setPattern] = useState<number[]>([]);
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [shakeAnim] = useState(new Animated.Value(0));
    const containerRef = useRef<View>(null);
    const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0 });

    const dots: Point[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            dots.push({
                x: col * DOT_SPACING + DOT_SPACING / 2,
                y: row * DOT_SPACING + DOT_SPACING / 2,
                index: row * GRID_SIZE + col,
            });
        }
    }

    const getDotAtPosition = (pageX: number, pageY: number): number | null => {
        const x = pageX - containerLayout.x;
        const y = pageY - containerLayout.y;

        for (const dot of dots) {
            const distance = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
            if (distance < DOT_SIZE * 1.5) {
                return dot.index;
            }
        }
        return null;
    };

    const shake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        Vibration.vibrate(200);
    }, [shakeAnim]);

    const handlePatternComplete = (finalPattern: number[]) => {
        if (finalPattern.length < 4) {
            setError(true);
            shake();
            setPattern([]);
            return;
        }

        if (verifyPattern(finalPattern)) {
            onSuccess();
        } else {
            setAttempts(prev => prev + 1);
            setError(true);
            shake();
            setPattern([]);
        }
    };

    const handleTouchStart = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        const dotIndex = getDotAtPosition(pageX, pageY);

        if (dotIndex !== null) {
            setIsDrawing(true);
            setError(false);
            setPattern([dotIndex]);
            Vibration.vibrate(30);
        }
    };

    const handleTouchMove = (e: GestureResponderEvent) => {
        if (!isDrawing) return;

        const { pageX, pageY } = e.nativeEvent;
        const dotIndex = getDotAtPosition(pageX, pageY);

        if (dotIndex !== null && !pattern.includes(dotIndex)) {
            setPattern(prev => [...prev, dotIndex]);
            Vibration.vibrate(30);
        }
    };

    const handleTouchEnd = () => {
        if (isDrawing && pattern.length > 0) {
            handlePatternComplete(pattern);
        }
        setIsDrawing(false);
    };

    const renderLines = () => {
        if (pattern.length < 2) return null;

        return pattern.slice(1).map((dotIndex, i) => {
            const prevDot = dots[pattern[i]];
            const currDot = dots[dotIndex];

            const dx = currDot.x - prevDot.x;
            const dy = currDot.y - prevDot.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
                <View
                    key={i}
                    style={[
                        styles.line,
                        error && styles.lineError,
                        {
                            left: prevDot.x,
                            top: prevDot.y,
                            width: length,
                            transform: [{ rotate: `${angle}deg` }],
                        },
                    ]}
                />
            );
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.lockIcon}>
                    <Text style={styles.lockEmoji}>🔒</Text>
                </View>
                <Text style={styles.title}>
                    {lockedAppName ? `Unlock ${lockedAppName}` : 'Draw Pattern'}
                </Text>
                <Text style={styles.subtitle}>
                    {error
                        ? `Wrong pattern. ${maxAttempts - attempts} attempts left`
                        : 'Draw your unlock pattern'
                    }
                </Text>
            </View>

            {/* Pattern Grid */}
            <Animated.View
                style={[
                    styles.gridContainer,
                    { transform: [{ translateX: shakeAnim }] }
                ]}
            >
                <View
                    ref={containerRef}
                    style={styles.grid}
                    onLayout={(e) => {
                        containerRef.current?.measure((x, y, w, h, pageX, pageY) => {
                            setContainerLayout({ x: pageX, y: pageY });
                        });
                    }}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={handleTouchStart}
                    onResponderMove={handleTouchMove}
                    onResponderRelease={handleTouchEnd}
                >
                    {/* Lines */}
                    {renderLines()}

                    {/* Dots */}
                    {dots.map((dot) => (
                        <View
                            key={dot.index}
                            style={[
                                styles.dot,
                                pattern.includes(dot.index) && styles.dotActive,
                                error && pattern.includes(dot.index) && styles.dotError,
                                {
                                    left: dot.x - DOT_SIZE / 2,
                                    top: dot.y - DOT_SIZE / 2,
                                },
                            ]}
                        >
                            {pattern.includes(dot.index) && (
                                <View style={[styles.dotInner, error && styles.dotInnerError]} />
                            )}
                        </View>
                    ))}
                </View>
            </Animated.View>

            {/* Instructions */}
            <Text style={styles.instructions}>
                Connect at least 4 dots
            </Text>
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
    gridContainer: {
        marginBottom: spacing.xl,
    },
    grid: {
        width: width - 100,
        height: width - 100,
        position: 'relative',
    },
    dot: {
        position: 'absolute',
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotActive: {
        borderColor: colors.accentPrimary,
        backgroundColor: 'rgba(255, 23, 68, 0.2)',
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 5,
    },
    dotError: {
        borderColor: colors.error,
        backgroundColor: 'rgba(255, 82, 82, 0.2)',
    },
    dotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accentPrimary,
    },
    dotInnerError: {
        backgroundColor: colors.error,
    },
    line: {
        position: 'absolute',
        height: 4,
        backgroundColor: colors.accentPrimary,
        transformOrigin: 'left center',
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 5,
        elevation: 3,
    },
    lineError: {
        backgroundColor: colors.error,
        shadowColor: colors.error,
    },
    instructions: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.lg,
    },
});

export default PatternOverlay;
