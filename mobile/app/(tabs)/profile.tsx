import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { useAuth } from '../../src/hooks/useAuth'
import { Colors, Spacing, Typography } from '../../src/constants/colors'
import { useState } from 'react'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, player, logout, refreshPlayer } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    if (user?.role === 'player') {
      await refreshPlayer()
    }
    setRefreshing(false)
  }

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout()
            router.replace('/(auth)/login')
          } catch (error) {
            Alert.alert('Error', 'Failed to logout')
          }
        },
        style: 'destructive',
      },
    ])
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account</Text>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{user?.name}</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            {user?.phone && <Text style={styles.emailText}>{user.phone}</Text>}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Player Profile (if player role) */}
      {user?.role === 'player' && player && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Player Profile</Text>
          <View style={styles.card}>
            {player.nickname && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nickname</Text>
                <Text style={styles.infoValue}>{player.nickname}</Text>
              </View>
            )}
            {player.date_of_birth && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{new Date(player.date_of_birth).toLocaleDateString()}</Text>
              </View>
            )}
            {player.city && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{player.city}</Text>
              </View>
            )}
            {player.role && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{player.role}</Text>
              </View>
            )}
            {player.batting_style && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Batting Style</Text>
                <Text style={styles.infoValue}>{player.batting_style}</Text>
              </View>
            )}
            {player.bowling_style && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bowling Style</Text>
                <Text style={styles.infoValue}>{player.bowling_style}</Text>
              </View>
            )}
            {player.jersey_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Jersey Number</Text>
                <Text style={styles.infoValue}>#{player.jersey_number}</Text>
              </View>
            )}
            {player.bio && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bio</Text>
                <Text style={styles.infoValue}>{player.bio}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuLabel}>Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuLabel}>Change Password</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuLabel}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing['3xl'],
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    opacity: 0.9,
  },
  section: {
    padding: Spacing.lg,
  },
  profileCard: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.sm,
  },
  nameText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emailText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  menuArrow: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textTertiary,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
})
