// Tiny typed client for the /api backend.

export interface TournamentSummary {
  id: string
  title: string
  game: string
  date: string
  time: string
  capacity: number
  format: string
  status: 'open' | 'live' | 'done'
  entryFee: number
  venue: string
  fill: number
}

export interface Player {
  id: string
  name: string
  character: string
  paid: boolean
  checkedIn: boolean
  seed?: number | null
}

export interface Match {
  id: string
  round: string
  playerA: string
  playerB: string
  scoreA: number
  scoreB: number
  live: boolean
  setup?: string | null
  winner: number
}

export interface Setup {
  id: string
  label: string
  hardware: string
  status: 'free' | 'busy'
  currentMatch?: string | null
}

export interface Need {
  id: string
  item: string
  gross: number
  stock: number
  recoverable: number
  action: string
  deadline: string
  resolved: boolean
}

export interface Task {
  id: string
  milestone: string
  date: string
  label: string
  owner: string
  done: boolean
  event: boolean
}

export interface Tournament extends TournamentSummary {
  players: Player[]
  matches: Match[]
  setups: Setup[]
  needs: Need[]
  tasks: Task[]
}

export interface Stats {
  tournaments: number
  participants: number
  paidRate: number
  collected: number
  outstanding: number
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export const api = {
  listTournaments: () => req<TournamentSummary[]>('tournaments'),
  getTournament: (id: string) => req<Tournament>(`tournaments/${id}`),
  getStats: () => req<Stats>('stats'),
  createTournament: (data: Partial<TournamentSummary>) =>
    req<Tournament>('tournaments', { method: 'POST', body: JSON.stringify(data) }),
  updateTournament: (id: string, data: Partial<TournamentSummary>) =>
    req<Tournament>(`tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTournament: (id: string) =>
    req<Tournament>(`tournaments/${id}`, { method: 'DELETE' }),

  addPlayer: (id: string, data: Partial<Player>) =>
    req<Player>(`tournaments/${id}/players`, { method: 'POST', body: JSON.stringify(data) }),
  patchPlayer: (id: string, pid: string, data: Partial<Player>) =>
    req<Player>(`tournaments/${id}/players/${pid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removePlayer: (id: string, pid: string) =>
    req<Player>(`tournaments/${id}/players/${pid}`, { method: 'DELETE' }),
  checkInAll: (id: string) =>
    req<Player[]>(`tournaments/${id}/players/checkin-all`, { method: 'POST' }),

  generateBracket: (id: string) =>
    req<Match[]>(`tournaments/${id}/matches/generate`, { method: 'POST' }),
  patchMatch: (id: string, mid: string, data: Partial<Match>) =>
    req<Match>(`tournaments/${id}/matches/${mid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createMatch: (id: string, data: Partial<Match>) =>
    req<Match>(`tournaments/${id}/matches`, { method: 'POST', body: JSON.stringify(data) }),

  patchSetup: (id: string, sid: string, data: Partial<Setup>) =>
    req<Setup>(`tournaments/${id}/setups/${sid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  addNeed: (id: string, data: Partial<Need>) =>
    req<Need>(`tournaments/${id}/needs`, { method: 'POST', body: JSON.stringify(data) }),
  patchNeed: (id: string, nid: string, data: Partial<Need>) =>
    req<Need>(`tournaments/${id}/needs/${nid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeNeed: (id: string, nid: string) =>
    req<Need>(`tournaments/${id}/needs/${nid}`, { method: 'DELETE' }),

  addTask: (id: string, data: Partial<Task>) =>
    req<Task>(`tournaments/${id}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  patchTask: (id: string, tid: string, data: Partial<Task>) =>
    req<Task>(`tournaments/${id}/tasks/${tid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeTask: (id: string, tid: string) =>
    req<Task>(`tournaments/${id}/tasks/${tid}`, { method: 'DELETE' }),

  reset: () => req('reset', { method: 'POST' }),
}
