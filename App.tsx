import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, Text, StyleSheet, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from './src/theme/theme';
import HomeScreen from './src/screens/HomeScreen';
import AppSelector from './src/screens/AppSelector';
import Settings from './src/screens/Settings';
import { initializeStorage, isFirstLaunch, setPINHash, setFirstLaunchComplete, hasPINSet } from './src/storage/storage';
import { PINOverlay } from './src/components/PINOverlay';

const Stack = createNativeStackNavigator();

// Dark theme for navigation
const AppTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accentPrimary,
    background: colors.bgPrimary,
    card: colors.bgSecondary,
    text: colors.textPrimary,
    border: colors.border,
  },
};

// Setup Screen for first-time PIN creation
const SetupScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [createdPIN, setCreatedPIN] = useState('');

  const handlePINCreate = (pin: string) => {
    setCreatedPIN(pin);
    setStep('confirm');
    return true; // Always return true for creation step
  };

  const handlePINConfirm = (pin: string) => {
    if (pin === createdPIN) {
      setPINHash(pin);
      setFirstLaunchComplete();
      onComplete();
      return true;
    }
    Alert.alert('Mismatch', 'PINs do not match. Please try again.');
    setStep('create');
    setCreatedPIN('');
    return false;
  };

  return (
    <View style={styles.setupContainer}>
      <Text style={styles.setupTitle}>
        {step === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
      </Text>
      <Text style={styles.setupSubtitle}>
        {step === 'create'
          ? 'This PIN will protect your locked apps'
          : 'Enter the same PIN again to confirm'
        }
      </Text>
      <PINOverlay
        onSuccess={() => { }}
        verifyPIN={step === 'create' ? handlePINCreate : handlePINConfirm}
        showBiometric={false}
      />
    </View>
  );
};

// Main Navigation
const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home">
        {(props) => (
          <HomeScreen
            {...props}
            onNavigateToApps={() => props.navigation.navigate('Apps')}
            onNavigateToSettings={() => props.navigation.navigate('Settings')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Apps">
        {(props) => (
          <AppSelector onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Settings">
        {(props) => (
          <Settings
            onBack={() => props.navigation.goBack()}
            onChangePIN={() => {
              Alert.alert('Change PIN', 'PIN change feature coming soon');
            }}
            onChangePattern={() => {
              Alert.alert('Change Pattern', 'Pattern change feature coming soon');
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await initializeStorage();
        const firstLaunch = isFirstLaunch() || !hasPINSet();
        setNeedsSetup(firstLaunch);
      } catch (error) {
        console.error('Init failed:', error);
      } finally {
        setIsReady(true);
      }
    }
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🔐</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      <NavigationContainer theme={AppTheme}>
        {needsSetup ? (
          <SetupScreen onComplete={() => setNeedsSetup(false)} />
        ) : (
          <MainNavigator />
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
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
    fontSize: 64,
  },
  setupContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: 60,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
});
