import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, Typography } from '../constants/colors'

interface BattingPlayer {
  player: { publicPlayerId: string | null; name: string }
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number | null
}

interface BowlingPlayer {
  player: { publicPlayerId: string | null; name: string }
  oversLabel: string
  runs: number
  wickets: number
  economy: number | null
}

interface CurrentPlayersProps {
  striker: BattingPlayer | null | undefined
  nonStriker: BattingPlayer | null | undefined
  bowler: BowlingPlayer | null | undefined
}

export function CurrentPlayers({ striker, nonStriker, bowler }: CurrentPlayersProps) {
  if (!striker && !nonStriker && !bowler) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Match Not Live</Text>
        <Text style={styles.emptyText}>Player information will appear when the match starts</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {striker && (
        <View style={styles.section}>
          <Text style={styles.roleLabel}>Striker</Text>
          <View style={styles.playerCard}>
            <Text style={styles.playerName}>{striker.player.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{striker.runs}</Text>
                <Text style={styles.statLabel}>Runs</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{striker.balls}</Text>
                <Text style={styles.statLabel}>Balls</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{striker.fours}</Text>
                <Text style={styles.statLabel}>4s</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{striker.sixes}</Text>
                <Text style={styles.statLabel}>6s</Text>
              </View>
              {striker.strikeRate !== null && (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{striker.strikeRate.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>SR</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {nonStriker && (
        <View style={styles.section}>
          <Text style={styles.roleLabel}>Non-Striker</Text>
          <View style={styles.playerCard}>
            <Text style={styles.playerName}>{nonStriker.player.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{nonStriker.runs}</Text>
                <Text style={styles.statLabel}>Runs</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{nonStriker.balls}</Text>
                <Text style={styles.statLabel}>Balls</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{nonStriker.fours}</Text>
                <Text style={styles.statLabel}>4s</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{nonStriker.sixes}</Text>
                <Text style={styles.statLabel}>6s</Text>
              </View>
              {nonStriker.strikeRate !== null && (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{nonStriker.strikeRate.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>SR</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {bowler && (
        <View style={styles.section}>
          <Text style={styles.roleLabel}>Bowler</Text>
          <View style={styles.playerCard}>
            <Text style={styles.playerName}>{bowler.player.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{bowler.oversLabel}</Text>
                <Text style={styles.statLabel}>Overs</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{bowler.runs}</Text>
                <Text style={styles.statLabel}>Runs</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{bowler.wickets}</Text>
                <Text style={styles.statLabel}>Wickets</Text>
              </View>
              {bowler.economy !== null && (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{bowler.economy.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Economy</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  roleLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  playerCard: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 8,
  },
  playerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  stat: {
    alignItems: 'center',
    minWidth: '22%',
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
})
