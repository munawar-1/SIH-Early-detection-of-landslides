import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LocationPermissionScreen } from './src/screens/LocationPermissionScreen';
import { PitchSimulationScreen } from './src/screens/PitchSimulationScreen';
import { getAuthToken } from './src/services/storageService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<'MAIN' | 'PITCH_SIMULATION'>('MAIN');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.log('No token found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {!isAuthenticated ? (
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : !hasLocationPermission ? (
        <LocationPermissionScreen 
          onPermissionComplete={() => setHasLocationPermission(true)} 
        />
      ) : currentScreen === 'PITCH_SIMULATION' ? (
        <PitchSimulationScreen onBackToHome={() => setCurrentScreen('MAIN')} />
      ) : (
        <HomeScreen 
          onOpenAlertDetail={(alert) => console.log('Open alert details', alert)} 
          onOpenSettings={() => {
            setIsAuthenticated(false);
            setHasLocationPermission(false);
          }} 
          onOpenPitchSimulation={() => setCurrentScreen('PITCH_SIMULATION')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
