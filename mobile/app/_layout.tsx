import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../src/store/authStore'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const { initialize, status } = useAuthStore()

  useEffect(() => {
    async function setup() {
      try {
        await initialize()
      } finally {
        if (fontsLoaded) {
          SplashScreen.hideAsync()
        }
      }
    }
    setup()
  }, [fontsLoaded])

  if (!fontsLoaded || status === 'loading') {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: false,
        }}
      >
        {status === 'unauthenticated' ? (
          <Stack.Screen name="(auth)" />
        ) : (
          <Stack.Screen name="(tabs)" />
        )}
      </Stack>
    </QueryClientProvider>
  )
}
