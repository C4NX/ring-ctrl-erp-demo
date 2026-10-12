import type { Plugin } from 'vite'
import {
  getPrisma,
  resetDB,
  shapeTournament,
  shapePlayer,
  shapeMatch,
  shapeSetup,
  shapeNeed,
  shapeTask,
  slug,
} from './db'

type Next = () => void

interface ReqLike {
  url?: string
  method?: string
  on: (ev: string, cb: (chunk?: unknown) => void) => void
}

interface ResLike {
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

const FULL_INCLUDE = {
  players: true,
  matches: true,
  setups: true,
  needs: true,
  tasks: true,
}

function json(res: ResLike, data: unknown, status = 200): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: ReqLike): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += typeof chunk === 'string' ? chunk : String(chunk)
    })
    req.on('end', () => resolve(body))
  })
}

/** French round names for a single-elimination bracket of `n` players. */
function buildRoundNames(n: number): string[] {
  if (n < 2) return ['Finale']
  // Number of matches in the first round = next power of two / 2.
  const pow2 = (v: number) => { let p = 1; while (p < v) p *= 2; return p }
  const firstRoundMatches = Math.max(1, pow2(n) / 2)
  const rounds: string[] = []
  let matches = firstRoundMatches
  while (matches > 0) {
    if (matches >= 16) rounds.push('Seizièmes de finale')
    else if (matches >= 8) rounds.push('Huitièmes de finale')
    else if (matches >= 4) rounds.push('Quarts de finale')
    else if (matches >= 2) rounds.push('Demi-finales')
    else rounds.push('Finale')
    matches = Math.floor(matches / 2)
  }
  if (rounds[rounds.length - 1] !== 'Finale') rounds.push('Finale')
  return rounds
}

/** A small REST backend (Prisma-backed) exposed at /api during dev and preview. */
export function apiServer(): Plugin {
  return {
    name: 'tournament-api',
    configureServer(server) {
      server.middlewares.use(async (req: ReqLike, res: ResLike, next: Next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith('/api')) return next()

        const method = (req.method ?? 'GET').toUpperCase()
        const path = url.replace(/^\/api\/?/, '')
        const segments = path.split('/').filter(Boolean)

        try {
          const prisma = await getPrisma()

          // GET /api/health
          if (path === 'health' && method === 'GET') {
            const count = await prisma.tournament.count()
            return json(res, { ok: true, tournaments: count })
          }

          // POST /api/reset
          if (path === 'reset' && method === 'POST') {
            await resetDB()
            const rows = await prisma.tournament.findMany({ include: FULL_INCLUDE })
            return json(res, rows.map(shapeTournament))
          }

          // GET /api/tournaments  (summary list)
          if (path === 'tournaments' && method === 'GET') {
            const rows = await prisma.tournament.findMany({ include: { players: true } })
            const summary = (rows as any[]).map((t) => ({
              id: t.id,
              title: t.title,
              game: t.game,
              date: t.date,
              time: t.time,
              capacity: t.capacity,
              format: t.format,
              status: t.status,
              entryFee: t.entryFee,
              venue: t.venue,
              fill: t.players.length,
            }))
            return json(res, summary)
          }

          // POST /api/tournaments
          if (path === 'tournaments' && method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}')
            const base = slug(String(body.title ?? 'event')) || 'event'
            const existing = await prisma.tournament.findMany({})
            const ids = new Set((existing as any[]).map((t) => t.id))
            let id = base
            let n = 2
            while (ids.has(id)) { id = `${base}-${n++}` }
            try {
              const created = await prisma.tournament.create({
                data: {
                  id,
                  title: String(body.title ?? 'Nouveau tournoi'),
                  game: String(body.game ?? 'Street Fighter 6'),
                  date: String(body.date ?? ''),
                  time: String(body.time ?? '13:30'),
                  capacity: Number(body.capacity ?? 16),
                  format: String(body.format ?? 'Simple élimination'),
                  status: String(body.status ?? 'open'),
                  entryFee: Number(body.entryFee ?? 10),
                  venue: String(body.venue ?? ''),
                },
              })
              return json(res, shapeTournament(created), 201)
            } catch {
              return json(res, { error: 'Tournament already exists' }, 409)
            }
          }

          // GET /api/stats  (computed dashboard aggregates)
          if (path === 'stats' && method === 'GET') {
            const rows = await prisma.tournament.findMany({ include: { players: true } })
            const allPlayers = (rows as any[]).flatMap((t) => t.players)
            const uniqueNames = new Set(allPlayers.map((p) => p.name))
            const paid = allPlayers.filter((p) => p.paid)
            const collected = (rows as any[]).reduce((sum, t) => sum + t.entryFee * t.players.filter((p: any) => p.paid).length, 0)
            const outstanding = (rows as any[]).reduce((sum, t) => sum + t.entryFee * t.players.filter((p: any) => !p.paid).length, 0)
            return json(res, {
              tournaments: rows.length,
              participants: uniqueNames.size,
              paidRate: allPlayers.length ? Math.round((paid.length / allPlayers.length) * 100) : 0,
              collected,
              outstanding,
            })
          }

          // /api/tournaments/:id
          if (segments[0] === 'tournaments' && segments[1]) {
            const tid = segments[1]
            const sub = segments[2]

            // GET /api/tournaments/:id
            if (segments.length === 2 && method === 'GET') {
              const row = await prisma.tournament.findUnique({ where: { id: tid }, include: FULL_INCLUDE })
              if (!row) return json(res, { error: 'Not found' }, 404)
              return json(res, shapeTournament(row))
            }

            // PATCH /api/tournaments/:id  (edit fields / change status)
            if (segments.length === 2 && method === 'PATCH') {
              const body = JSON.parse((await readBody(req)) || '{}')
              const data: Record<string, unknown> = {}
              for (const k of ['title', 'game', 'date', 'time', 'format', 'status', 'venue']) {
                if (typeof body[k] === 'string') data[k] = body[k]
              }
              if (typeof body.capacity === 'number') data.capacity = body.capacity
              if (typeof body.entryFee === 'number') data.entryFee = body.entryFee
              try {
                const updated = await prisma.tournament.update({ where: { id: tid }, data })
                return json(res, shapeTournament(updated))
              } catch {
                return json(res, { error: 'Not found' }, 404)
              }
            }

            // DELETE /api/tournaments/:id
            if (segments.length === 2 && method === 'DELETE') {
              try {
                const removed = await prisma.tournament.delete({ where: { id: tid } })
                return json(res, shapeTournament(removed))
              } catch {
                return json(res, { error: 'Not found' }, 404)
              }
            }

            // players
            if (sub === 'players') {
              // GET /api/tournaments/:id/players
              if (segments.length === 3 && method === 'GET') {
                const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { players: true } })
                if (!row) return json(res, { error: 'Not found' }, 404)
                return json(res, (row as any).players.map(shapePlayer))
              }

              // POST /api/tournaments/:id/players
              if (segments.length === 3 && method === 'POST') {
                const body = JSON.parse((await readBody(req)) || '{}')
                const name = String(body.name ?? '').trim()
                if (!name) return json(res, { error: 'name required' }, 400)
                const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { players: true } })
                if (!row) return json(res, { error: 'Not found' }, 404)
                if ((row as any).players.length >= (row as any).capacity) {
                  return json(res, { error: 'Tournament full' }, 409)
                }
                // Build a unique id: if the slug collides with an existing player
                // in this tournament, append a numeric suffix.
                const base = slug(name) || 'player'
                const existing = new Set((row as any).players.map((p: any) => p.id))
                let id = base
                let n = 2
                while (existing.has(id)) { id = `${base}-${n++}` }
                try {
                  const created = await prisma.player.create({
                    data: {
                      id,
                      name,
                      character: String(body.character ?? '—'),
                      paid: Boolean(body.paid ?? false),
                      checkedIn: Boolean(body.checkedIn ?? false),
                      seed: typeof body.seed === 'number' ? body.seed : (row as any).players.length + 1,
                      tournamentId: tid,
                    },
                  })
                  return json(res, shapePlayer(created), 201)
                } catch {
                  return json(res, { error: 'Player already exists' }, 409)
                }
              }

              // POST /api/tournaments/:id/players/checkin-all  (bulk check-in)
              if (segments.length === 4 && segments[3] === 'checkin-all' && method === 'POST') {
                await prisma.player.updateMany({ where: { tournamentId: tid }, data: { checkedIn: true } })
                const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { players: true } })
                if (!row) return json(res, { error: 'Not found' }, 404)
                return json(res, (row as any).players.map(shapePlayer))
              }

              // PATCH /api/tournaments/:id/players/:pid
              if (segments.length === 4 && method === 'PATCH') {
                const pid = segments[3]
                const body = JSON.parse((await readBody(req)) || '{}')
                const data: Record<string, unknown> = {}
                if (typeof body.paid === 'boolean') data.paid = body.paid
                if (typeof body.checkedIn === 'boolean') data.checkedIn = body.checkedIn
                if (typeof body.character === 'string') data.character = body.character
                if (typeof body.name === 'string') data.name = body.name
                if (typeof body.seed === 'number') data.seed = body.seed
                try {
                  const updated = await prisma.player.update({ where: { id: pid }, data })
                  return json(res, shapePlayer(updated))
                } catch {
                  return json(res, { error: 'Player not found' }, 404)
                }
              }

              // DELETE /api/tournaments/:id/players/:pid
              if (segments.length === 4 && method === 'DELETE') {
                const pid = segments[3]
                try {
                  const removed = await prisma.player.delete({ where: { id: pid } })
                  return json(res, shapePlayer(removed))
                } catch {
                  return json(res, { error: 'Player not found' }, 404)
                }
              }
            }

            // POST /api/tournaments/:id/matches/generate  (build a single-elim bracket from seeded players)
            if (sub === 'matches' && segments.length === 4 && segments[3] === 'generate' && method === 'POST') {
              const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { players: true } })
              if (!row) return json(res, { error: 'Not found' }, 404)
              const players = (row as any).players as any[]
              if (players.length < 2) return json(res, { error: 'Need at least 2 players' }, 400)
              // Ensure every player has a seed; missing seeds filled by registration order.
              const seeded = players
                .map((p, i) => ({ ...p, seed: typeof p.seed === 'number' ? p.seed : i + 1 }))
                .sort((a, b) => a.seed - b.seed)
              // Wipe existing matches and rebuild.
              await prisma.match.deleteMany({ where: { tournamentId: tid } })
              const roundNames = buildRoundNames(seeded.length)
              let matchNo = 0
              const created: any[] = []
              for (let r = 0; r < roundNames.length; r++) {
                const matchesInRound = Math.max(1, Math.floor(seeded.length / Math.pow(2, r + 1)))
                for (let m = 0; m < matchesInRound; m++) {
                  matchNo++
                  const id = `m-r${r + 1}-${m + 1}`
                  let a = 'À déterminer'
                  let b = 'À déterminer'
                  if (r === 0) {
                    // Standard seeded pairing: 1 vs last, 2 vs last-1, ...
                    a = seeded[m]?.name ?? a
                    b = seeded[seeded.length - 1 - m]?.name ?? b
                  }
                  const mk = await prisma.match.create({
                    data: { id, round: roundNames[r], playerA: a, playerB: b, tournamentId: tid },
                  })
                  created.push(mk)
                }
              }
              const fresh = await prisma.tournament.findUnique({ where: { id: tid }, include: { matches: true } })
              return json(res, (fresh as any).matches.map(shapeMatch), 201)
            }

            // matches
            if (sub === 'matches') {
              if (segments.length === 4 && method === 'PATCH') {
                const mid = segments[3]
                const body = JSON.parse((await readBody(req)) || '{}')
                const data: Record<string, unknown> = {}
                if (typeof body.scoreA === 'number') data.scoreA = body.scoreA
                if (typeof body.scoreB === 'number') data.scoreB = body.scoreB
                if (typeof body.live === 'boolean') data.live = body.live
                if (typeof body.setup === 'string') data.setup = body.setup
                if (typeof body.playerA === 'string') data.playerA = body.playerA
                if (typeof body.playerB === 'string') data.playerB = body.playerB
                if (typeof body.winner === 'number') data.winner = body.winner
                if (typeof body.round === 'string') data.round = body.round
                try {
                  const updated = await prisma.match.update({ where: { id: mid }, data })
                  return json(res, shapeMatch(updated))
                } catch {
                  return json(res, { error: 'Match not found' }, 404)
                }
              }
              // POST /api/tournaments/:id/matches  (manual match creation)
              if (segments.length === 3 && method === 'POST') {
                const body = JSON.parse((await readBody(req)) || '{}')
                const id = slug(String(body.id ?? `match-${Date.now()}`))
                const created = await prisma.match.create({
                  data: {
                    id,
                    round: String(body.round ?? 'Hors tour'),
                    playerA: String(body.playerA ?? 'À déterminer'),
                    playerB: String(body.playerB ?? 'À déterminer'),
                    scoreA: Number(body.scoreA ?? 0),
                    scoreB: Number(body.scoreB ?? 0),
                    live: Boolean(body.live ?? false),
                    setup: typeof body.setup === 'string' ? body.setup : null,
                    winner: Number(body.winner ?? 0),
                    tournamentId: tid,
                  },
                })
                return json(res, shapeMatch(created), 201)
              }
            }

            // setups
            if (sub === 'setups') {
              if (segments.length === 3 && method === 'GET') {
                const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { setups: true } })
                if (!row) return json(res, { error: 'Not found' }, 404)
                return json(res, (row as any).setups.map(shapeSetup))
              }
              if (segments.length === 4 && method === 'PATCH') {
                const sid = segments[3]
                const body = JSON.parse((await readBody(req)) || '{}')
                const data: Record<string, unknown> = {}
                if (typeof body.status === 'string') data.status = body.status
                if (typeof body.currentMatch === 'string') data.currentMatch = body.currentMatch
                try {
                  const updated = await prisma.setup.update({ where: { id: sid }, data })
                  return json(res, shapeSetup(updated))
                } catch {
                  return json(res, { error: 'Setup not found' }, 404)
                }
              }
            }

            // needs
            if (sub === 'needs') {
              if (segments.length === 3 && method === 'GET') {
                const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { needs: true } })
                if (!row) return json(res, { error: 'Not found' }, 404)
                return json(res, (row as any).needs.map(shapeNeed))
              }
              // POST /api/tournaments/:id/needs
              if (segments.length === 3 && method === 'POST') {
                const body = JSON.parse((await readBody(req)) || '{}')
                const item = String(body.item ?? '').trim()
                if (!item) return json(res, { error: 'item required' }, 400)
                const created = await prisma.need.create({
                  data: {
                    id: slug(item) + '-' + Date.now().toString(36),
                    item,
                    gross: Number(body.gross ?? 0),
                    stock: Number(body.stock ?? 0),
                    recoverable: Number(body.recoverable ?? 0),
                    action: String(body.action ?? ''),
                    deadline: String(body.deadline ?? '—'),
                    resolved: Boolean(body.resolved ?? false),
                    tournamentId: tid,
                  },
                })
                return json(res, shapeNeed(created), 201)
              }
              // PATCH /api/tournaments/:id/needs/:nid
              if (segments.length === 4 && method === 'PATCH') {
                const nid = segments[3]
                const body = JSON.parse((await readBody(req)) || '{}')
                const data: Record<string, unknown> = {}
                for (const k of ['item', 'action', 'deadline']) {
                  if (typeof body[k] === 'string') data[k] = body[k]
                }
                for (const k of ['gross', 'stock', 'recoverable']) {
                  if (typeof body[k] === 'number') data[k] = body[k]
                }
                if (typeof body.resolved === 'boolean') data.resolved = body.resolved
                try {
                  const updated = await prisma.need.update({ where: { id: nid }, data })
                  return json(res, shapeNeed(updated))
                } catch {
                  return json(res, { error: 'Need not found' }, 404)
                }
              }
              // DELETE /api/tournaments/:id/needs/:nid
              if (segments.length === 4 && method === 'DELETE') {
                const nid = segments[3]
                try {
                  const removed = await prisma.need.delete({ where: { id: nid } })
                  return json(res, shapeNeed(removed))
                } catch {
                  return json(res, { error: 'Need not found' }, 404)
                }
              }
            }

            // tasks
            if (sub === 'tasks') {
              if (segments.length === 3 && method === 'GET') {
                const row = await prisma.tournament.findUnique({ where: { id: tid }, include: { tasks: true } })
                if (!row) return json(res, { error: 'Not found' }, 404)
                return json(res, (row as any).tasks.map(shapeTask))
              }
              // POST /api/tournaments/:id/tasks
              if (segments.length === 3 && method === 'POST') {
                const body = JSON.parse((await readBody(req)) || '{}')
                const label = String(body.label ?? '').trim()
                if (!label) return json(res, { error: 'label required' }, 400)
                const created = await prisma.task.create({
                  data: {
                    id: slug(label) + '-' + Date.now().toString(36),
                    milestone: String(body.milestone ?? 'J0'),
                    date: String(body.date ?? '—'),
                    label,
                    owner: String(body.owner ?? '—'),
                    done: Boolean(body.done ?? false),
                    event: Boolean(body.event ?? false),
                    tournamentId: tid,
                  },
                })
                return json(res, shapeTask(created), 201)
              }
              if (segments.length === 4 && method === 'PATCH') {
                const taskid = segments[3]
                const body = JSON.parse((await readBody(req)) || '{}')
                const data: Record<string, unknown> = {}
                if (typeof body.done === 'boolean') data.done = body.done
                if (typeof body.label === 'string') data.label = body.label
                if (typeof body.owner === 'string') data.owner = body.owner
                if (typeof body.milestone === 'string') data.milestone = body.milestone
                if (typeof body.date === 'string') data.date = body.date
                if (typeof body.event === 'boolean') data.event = body.event
                try {
                  const updated = await prisma.task.update({ where: { id: taskid }, data })
                  return json(res, shapeTask(updated))
                } catch {
                  return json(res, { error: 'Task not found' }, 404)
                }
              }
              // DELETE /api/tournaments/:id/tasks/:tid2
              if (segments.length === 4 && method === 'DELETE') {
                const taskid = segments[3]
                try {
                  const removed = await prisma.task.delete({ where: { id: taskid } })
                  return json(res, shapeTask(removed))
                } catch {
                  return json(res, { error: 'Task not found' }, 404)
                }
              }
            }
          }

          return json(res, { error: 'Not found' }, 404)
        } catch (err) {
          return json(res, { error: (err as Error).message }, 500)
        }
      })
    },
  }
}
