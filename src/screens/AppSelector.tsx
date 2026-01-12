import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme/theme';
import { AppCard } from '../components/AppCard';
import { AppLocker, InstalledApp } from '../native/AppLockerModule';

interface AppSelectorProps {
    onBack?: () => void;
}

export const AppSelector: React.FC<AppSelectorProps> = ({ onBack }) => {
    const [apps, setApps] = useState<InstalledApp[]>([]);
    const [lockedApps, setLockedApps] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'locked' | 'unlocked'>('all');

    useEffect(() => {
        loadApps();
    }, []);

    const loadApps = async () => {
        try {
            setLoading(true);
            const [installedApps, locked] = await Promise.all([
                AppLocker.getInstalledApps(),
                AppLocker.getLockedApps(),
            ]);

            // Sort alphabetically
            installedApps.sort((a, b) => a.label.localeCompare(b.label));

            setApps(installedApps);
            setLockedApps(locked);
        } catch (error) {
            console.error('Failed to load apps:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAppLock = async (packageName: string) => {
        const isCurrentlyLocked = lockedApps.includes(packageName);
        const newLockedApps = isCurrentlyLocked
            ? lockedApps.filter(p => p !== packageName)
            : [...lockedApps, packageName];

        setLockedApps(newLockedApps);

        try {
            await AppLocker.setLockedApps(newLockedApps);
        } catch (error) {
            console.error('Failed to update locked apps:', error);
            // Revert on failure
            setLockedApps(lockedApps);
        }
    };

    const filteredApps = apps.filter(app => {
        const matchesSearch = app.label.toLowerCase().includes(searchQuery.toLowerCase());
        const isLocked = lockedApps.includes(app.packageName);

        if (filter === 'locked') return matchesSearch && isLocked;
        if (filter === 'unlocked') return matchesSearch && !isLocked;
        return matchesSearch;
    });

    const FilterButton = ({
        title,
        value,
        count
    }: {
        title: string;
        value: 'all' | 'locked' | 'unlocked';
        count: number;
    }) => (
        <TouchableOpacity
            style={[styles.filterButton, filter === value && styles.filterButtonActive]}
            onPress={() => setFilter(value)}
        >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {title} ({count})
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
                <Text style={styles.loadingText}>Loading apps...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>Select Apps to Lock</Text>
                <Text style={styles.subtitle}>
                    {lockedApps.length} app{lockedApps.length !== 1 ? 's' : ''} protected
                </Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search apps..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={styles.clearButton}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                <FilterButton title="All" value="all" count={apps.length} />
                <FilterButton title="Locked" value="locked" count={lockedApps.length} />
                <FilterButton
                    title="Unlocked"
                    value="unlocked"
                    count={apps.length - lockedApps.length}
                />
            </View>

            {/* App List */}
            <FlatList
                data={filteredApps}
                keyExtractor={item => item.packageName}
                numColumns={3}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                    <AppCard
                        label={item.label}
                        packageName={item.packageName}
                        icon={item.icon}
                        isLocked={lockedApps.includes(item.packageName)}
                        onToggle={() => toggleAppLock(item.packageName)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📱</Text>
                        <Text style={styles.emptyText}>No apps found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.textSecondary,
        fontSize: typography.sizes.md,
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
    subtitle: {
        fontSize: typography.sizes.sm,
        color: colors.accentPrimary,
        marginTop: spacing.xs,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
    },
    clearButton: {
        fontSize: 18,
        color: colors.textSecondary,
        padding: spacing.sm,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    filterButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterButtonActive: {
        backgroundColor: colors.accentPrimary,
        borderColor: colors.accentPrimary,
    },
    filterText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.textPrimary,
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    row: {
        justifyContent: 'space-between',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
});

export default AppSelector;
