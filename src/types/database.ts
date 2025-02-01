export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Tournament = {
  id: string
  name: string
  logo?: string
  start_date: string
  end_date: string
  num_courts: number
  created_at: string
}

export type TournamentMatch = {
  id: string
  tournament_id: string
  court_number: number
  scheduled_time: string
  scoreboard_id?: string
  team1_name: string
  team2_name: string
  status: 'scheduled' | 'in_progress' | 'completed'
  created_at: string
}

export type ScoreboardData = {
  id: string
  matchTitle: string
  matchLogo?: string
  gameType: 'tennis' | 'padel'
  matchType: 'singles' | 'doubles'
  sets: 3 | 5
  team1: {
    name: string
    logo?: string
    players: string[]
    sets: number
    games: number
    points: string
    tiebreakPoints?: number
    isServing: boolean
  }
  team2: {
    name: string
    logo?: string
    players: string[]
    sets: number
    games: number
    points: string
    tiebreakPoints?: number
    isServing: boolean
  }
  lastUpdated: string
  isActive: boolean
  tournament_id?: string
  court_number?: number
}