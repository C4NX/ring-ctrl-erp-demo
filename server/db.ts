// Database layer backed by Prisma (SQLite).
//
// The Prisma client is imported dynamically so the rest of the app keeps
// loading even if `prisma generate` has not run yet (e.g. on a fresh clone).
// `ensurePrisma()` resolves the generated client and seeds the database on
// first use. Call it from the API routes before touching data.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, statSync } from 'node:fs'
import { seedTournaments, slug, type SeedTournament } from './seed'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_FILE = resolve(__dirname, '..', 'prisma', 'dev.db')
const SCHEMA_FILE = resolve(__dirname, '..', 'prisma', 'schema.prisma')

// The shape returned to the API after shaping Prisma rows. This mirrors the
// old in-memory model so the frontend client (`src/api.ts`) needs no changes.
export interface Tournament {
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
  players: Player[]
  matches: Match[]
  setups: Setup[]
  needs: Need[]
  tasks: Task[]
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

export interface PrismaClientLike {
  tournament: {
    count: (args?: { where?: unknown }) => Promise<number>
    findMany: (args?: { include?: unknown }) => Promise<unknown[]>
    findUnique: (args: { where: { id: string }; include?: unknown }) => Promise<unknown | null>
    create: (args: { data: unknown }) => Promise<unknown>
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
  player: {
    count: (args?: { where?: unknown }) => Promise<number>
    create: (args: { data: unknown }) => Promise<unknown>
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>
    updateMany: (args: { where: unknown; data: unknown }) => Promise<{ count: number }>
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
  match: {
    create: (args: { data: unknown }) => Promise<unknown>
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>
    deleteMany: (args: { where: unknown }) => Promise<{ count: number }>
  }
  setup: {
    create: (args: { data: unknown }) => Promise<unknown>
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>
  }
  need: {
    create: (args: { data: unknown }) => Promise<unknown>
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
  task: {
    create: (args: { data: unknown }) => Promise<unknown>
    update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
  $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number>
  $disconnect: () => Promise<void>
}

let clientPromise: Promise<PrismaClientLike> | null = null

async function importPrismaClient(): Promise<PrismaClientLike> {
  // Import the generated client. Throws if `prisma generate` hasn't run.
  const mod = await import('@prisma/client')
  const PrismaClient = mod.PrismaClient ?? mod.default?.PrismaClient
  if (!PrismaClient) {
    throw new Error(
      'PrismaClient not found. Run `pnpm prisma:generate` (and `pnpm prisma:push`) before starting the server.',
    )
  }
  return new PrismaClient() as unknown as PrismaClientLike
}

/** Create the SQLite file + tables from the schema if the DB file is missing
 *  or empty. Must run BEFORE the Prisma client connects, otherwise the client
 *  opens a connection to a file without tables (or a stale one) and writes
 *  fail with a read-only / no-such-table error. */
async function ensureSchema(): Promise<void> {
  if (existsSync(DB_FILE) && statSync(DB_FILE).size > 0) return
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate', `--schema=${SCHEMA_FILE}`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new Error('`prisma db push` failed. Make sure Prisma is installed and the schema is valid.')
  }
}

async function seedIfEmpty(prisma: PrismaClientLike): Promise<void> {
  const count = await prisma.tournament.count()
  if (count > 0) return

  for (const t of seedTournaments()) {
    await createTournamentRow(prisma, t)
  }
}

async function createTournamentRow(prisma: PrismaClientLike, s: SeedTournament): Promise<void> {
  await prisma.tournament.create({
    data: {
      id: s.id,
      title: s.title,
      game: s.game,
      date: s.date,
      time: s.time,
      capacity: s.capacity,
      format: s.format,
      status: s.status,
      entryFee: s.entryFee,
      venue: s.venue,
      players: { create: s.players.map((p) => ({ ...p, seed: p.seed ?? null })) },
      matches: { create: s.matches.map((m) => ({ ...m, setup: m.setup ?? null, winner: m.winner ?? 0 })) },
      setups: { create: s.setups.map((st) => ({ ...st, currentMatch: st.currentMatch ?? null })) },
      needs: { create: s.needs.map((n) => ({ ...n, resolved: n.resolved ?? false })) },
      tasks: { create: s.tasks.map((tk) => ({ ...tk })) },
    },
  })
}

/** Returns a ready-to-use, seeded Prisma client (cached for the process). */
export async function getPrisma(): Promise<PrismaClientLike> {
  if (clientPromise) return clientPromise
  clientPromise = (async () => {
    // Create/sync the SQLite file + tables BEFORE instantiating the client,
    // so the connection opens against a valid, writable database.
    await ensureSchema()
    const prisma = await importPrismaClient()
    await seedIfEmpty(prisma)
    return prisma
  })()
  return clientPromise
}

/** Drop all rows and re-seed from `seed.ts`. Used by `POST /api/reset`. */
export async function resetDB(): Promise<void> {
  const prisma = await getPrisma()
  // SQLite: truncate via raw SQL (fast and order-independent with CASCADE).
  await prisma.$executeRawUnsafe('DELETE FROM tasks')
  await prisma.$executeRawUnsafe('DELETE FROM needs')
  await prisma.$executeRawUnsafe('DELETE FROM setups')
  await prisma.$executeRawUnsafe('DELETE FROM matches')
  await prisma.$executeRawUnsafe('DELETE FROM players')
  await prisma.$executeRawUnsafe('DELETE FROM tournaments')
  for (const t of seedTournaments()) {
    await createTournamentRow(prisma, t)
  }
}

/** Shape a raw Prisma tournament row (with relations included) into the API model. */
export function shapeTournament(row: any): Tournament {
  return {
    id: row.id,
    title: row.title,
    game: row.game,
    date: row.date,
    time: row.time,
    capacity: row.capacity,
    format: row.format,
    status: row.status as Tournament['status'],
    entryFee: row.entryFee,
    venue: row.venue,
    players: (row.players ?? []).map(shapePlayer),
    matches: (row.matches ?? []).map(shapeMatch),
    setups: (row.setups ?? []).map(shapeSetup),
    needs: (row.needs ?? []).map(shapeNeed),
    tasks: (row.tasks ?? []).map(shapeTask),
  }
}

export function shapePlayer(row: any): Player {
  return {
    id: row.id,
    name: row.name,
    character: row.character,
    paid: Boolean(row.paid),
    checkedIn: Boolean(row.checkedIn),
    seed: row.seed ?? null,
  }
}

export function shapeMatch(row: any): Match {
  return {
    id: row.id,
    round: row.round,
    playerA: row.playerA,
    playerB: row.playerB,
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    live: Boolean(row.live),
    setup: row.setup ?? undefined,
    winner: Number(row.winner ?? 0),
  }
}

export function shapeSetup(row: any): Setup {
  return {
    id: row.id,
    label: row.label,
    hardware: row.hardware,
    status: row.status as Setup['status'],
    currentMatch: row.currentMatch ?? undefined,
  }
}

export function shapeNeed(row: any): Need {
  return {
    id: row.id,
    item: row.item,
    gross: row.gross,
    stock: row.stock,
    recoverable: row.recoverable,
    action: row.action,
    deadline: row.deadline,
    resolved: Boolean(row.resolved),
  }
}

export function shapeTask(row: any): Task {
  return {
    id: row.id,
    milestone: row.milestone,
    date: row.date,
    label: row.label,
    owner: row.owner,
    done: Boolean(row.done),
    event: Boolean(row.event),
  }
}

export { slug }
