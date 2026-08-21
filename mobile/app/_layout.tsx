import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAuthStore, initializeAuthStore } from '../src/store/authStore'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()
initializeAuthStore(queryClient)

export default function RootLayout() {
  const { initialize, status } = useAuthStore()

  useEffect(() => {
    async function setup() {
      try {
        await initialize()
      } finally {
        SplashScreen.hideAsync()
      }
    }
    setup()
  }, [])

  if (status === 'loading') {
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
