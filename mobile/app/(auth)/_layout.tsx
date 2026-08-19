import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      } as any}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="otp-verify" />
    </Stack>
  )
}
