import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as teamApi from '../services/teamApi'

export function useDiscoverTeams(query?: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['teams', 'discover', query, limit, offset],
    queryFn: () => teamApi.discoverTeams(query, limit, offset),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSearchTeams(query: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['teams', 'search', query, limit, offset],
    queryFn: () => teamApi.searchTeams(query, limit, offset),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!query && query.length > 0,
  })
}

export function useTeamDetail(teamId: number) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => teamApi.getTeamProfile(teamId),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!teamId,
  })
}

export function useTeamPlayers(teamId: number) {
  return useQuery({
    queryKey: ['teams', teamId, 'players'],
    queryFn: () => teamApi.getTeamPlayers(teamId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!teamId,
  })
}

export function useTeamMatches(teamId: number) {
  return useQuery({
    queryKey: ['teams', teamId, 'matches'],
    queryFn: () => teamApi.getTeamMatches(teamId),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!teamId,
  })
}

export function useAllTeams() {
  return useQuery({
    queryKey: ['teams', 'all'],
    queryFn: () => teamApi.getAllTeams(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; short_name: string; logo_url?: string }) =>
      teamApi.createTeam(data),
    onSuccess: (data) => {
      // Invalidate all team queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      // Also invalidate the discover/search queries
      queryClient.invalidateQueries({ queryKey: ['teams', 'discover'] })
      queryClient.invalidateQueries({ queryKey: ['teams', 'search'] })
      queryClient.invalidateQueries({ queryKey: ['teams', 'all'] })
    },
  })
}
