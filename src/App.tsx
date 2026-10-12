import { useCallback, useEffect, useState, type ReactNode } from "react"
import { api, type Tournament, type TournamentSummary, type Player, type Setup, type Match, type Task, type Need, type Stats } from "./api"

type Page = "dashboard" | "tournament" | "needs" | "planning" | "public"
type DetailTab = "Inscriptions" | "Bracket" | "Setups" | "Besoins & matériel"
type MobileTab = "Inscrits" | "Bracket" | "Setups" | "Paiements"

/* ---------------------------------- hooks --------------------------------- */

function useTournament(id: string) {
  const [data, setData] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setData(await api.getTournament(id))
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => { void reload() }, [reload])
  return { data, loading, err, reload }
}

function useSummaries() {
  const [items, setItems] = useState<TournamentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    setLoading(true)
    api.listTournaments().then((s) => { setItems(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  return { items, loading, reload: load }
}

function useStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const load = useCallback(() => { api.getStats().then(setStats).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  return { stats, reload: load }
}

/* ---------------------------------- icons --------------------------------- */

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <rect x="3" y="3" width="7" height="7" rx="1" />,
    trophy: <path d="M8 4h8v4a4 4 0 0 1-8 0V4Zm-4 2h4v2a2 2 0 0 1-4 0V6Zm12 0h4v2a2 2 0 0 0 4 0V6ZM12 12v5m-4 3h8" />,
    box: <path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" />,
    calendar: <path d="M16 3v4M8 3v4M4 7h16v14H4z" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    radio: <path d="M5 5 3 3m16 2 2-2m-2 16 2 2M5 19l-2 2M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />,
    refresh: <path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7" />,
    coin: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 5.5c-.7-.7-1.6-1-3-1-1.7 0-3 1-3 2.4s1 2.1 3 2.5 3 1.1 3 2.5-1.3 2.4-3 2.4c-1.4 0-2.5-.4-3.3-1.2M12 5v14" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    trash: <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />,
    search: <path d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />,
    link: <path d="M9 15l6-6m-5-2 1-1a4 4 0 0 1 6 6l-1 1m-4 4-1 1a4 4 0 0 1-6-6l1-1" />,
    play: <path d="m6 4 12 8-12 8V4Z" />,
    money: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

/* --------------------------------- atoms ---------------------------------- */

function Button({ children, kind = "primary", onClick, className = "", type = "button", disabled, title }: { children: ReactNode; kind?: "primary" | "secondary" | "ghost" | "danger"; onClick?: () => void; className?: string; type?: "button" | "submit"; disabled?: boolean; title?: string }) {
  return <button type={type} title={title} className={`btn btn-${kind} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function statusTone(status: string): string {
  return status === "open" ? "purple" : status === "live" ? "cyan" : "muted"
}

function statusLabel(status: string): string {
  return status === "open" ? "Inscriptions ouvertes" : status === "live" ? "En cours" : "Terminé"
}

function Header({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={`dialog ${wide ? "dialog-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        {children}
      </div>
    </div>
  )
}

/* -------------------------------- dashboard ------------------------------- */

function Dashboard({ openTournament }: { openTournament: (id: string) => void }) {
  const { items, loading, reload } = useSummaries()
  const { stats, reload: reloadStats } = useStats()
  const [creating, setCreating] = useState(false)

  const statCards = [
    { icon: "trophy", label: "Tournois", value: stats ? String(stats.tournaments) : "—" },
    { icon: "users", label: "Participants uniques", value: stats ? String(stats.participants) : "—" },
    { icon: "check", label: "Taux de paiement", value: stats ? `${stats.paidRate}%` : "—" },
    { icon: "money", label: "Encaissé / dû", value: stats ? `${stats.collected}€ / ${stats.outstanding}€` : "—" },
  ]

  return (
    <div className="page">
      <Header eyebrow="Vue d'ensemble" title="Tournois">
        <Button kind="secondary" onClick={() => { reload(); void reloadStats() }} title="Rafraîchir"><Icon name="refresh" /></Button>
        <Button onClick={() => setCreating(true)}><Icon name="plus" />Créer un tournoi</Button>
      </Header>
      <div className="stats-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top"><Icon name={s.icon} /></div>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="section-heading"><div><h2>Événements</h2><p>{loading ? "Chargement…" : `${items.length} tournois`}</p></div></div>
      <div className="tournament-list">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div className="skeleton card-skel" key={i} />)
          : items.map((t) => <TournamentCard key={t.id} item={t} onOpen={() => openTournament(t.id)} onChanged={() => { reload(); void reloadStats() }} />)}
      </div>
      {creating && <TournamentForm onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); reload(); void reloadStats(); openTournament(id) }} />}
    </div>
  )
}

function TournamentCard({ item, onOpen, onChanged }: { item: TournamentSummary; onOpen: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const pct = item.capacity ? Math.round((item.fill / item.capacity) * 100) : 0
  const del = async () => {
    if (!confirm(`Supprimer « ${item.title} » ?`)) return
    await api.deleteTournament(item.id); onChanged()
  }
  return (
    <div className="tournament-card">
      <button className="tournament-main" onClick={onOpen}>
        <div className="tournament-title-row">
          <div><h3>{item.title}</h3><p>{item.game}</p></div>
          <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
        </div>
        <div className="tournament-meta">
          <span><Icon name="calendar" size={14} />{item.date || "Date à définir"}{item.time && ` · ${item.time}`}</span>
          <span>{item.fill}/{item.capacity}</span>
        </div>
        <div className="progress"><span style={{ width: `${pct}%` }} /></div>
      </button>
      <div className="card-actions">
        <button className="icon-btn" title="Modifier" onClick={() => setEditing(true)}><Icon name="edit" size={15} /></button>
        <button className="icon-btn" title="Supprimer" onClick={del}><Icon name="trash" size={15} /></button>
      </div>
      {editing && <TournamentForm existing={item} onClose={() => setEditing(false)} onCreated={() => { setEditing(false); onChanged() }} />}
    </div>
  )
}

function TournamentForm({ existing, onClose, onCreated }: { existing?: TournamentSummary; onClose: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({
    title: existing?.title ?? "", game: existing?.game ?? "Street Fighter 6", date: existing?.date ?? "",
    time: existing?.time ?? "13:30", capacity: existing?.capacity ?? 16, format: existing?.format ?? "Simple élimination",
    entryFee: existing?.entryFee ?? 10, venue: existing?.venue ?? "", status: existing?.status ?? "open",
  })
  const set = (k: string, v: string | number) => setF((s) => ({ ...s, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return
    if (existing) { await api.updateTournament(existing.id, f); onCreated(existing.id) }
    else { const t = await api.createTournament(f); onCreated(t.id) }
  }
  return (
    <Modal title={existing ? "Modifier le tournoi" : "Créer un tournoi"} onClose={onClose}>
      <form className="dialog-body grid-form" onSubmit={submit}>
        <Field label="Titre"><input value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus /></Field>
        <Field label="Jeu"><input value={f.game} onChange={(e) => set("game", e.target.value)} /></Field>
        <Field label="Date"><input value={f.date} onChange={(e) => set("date", e.target.value)} placeholder="Samedi 22 novembre" /></Field>
        <Field label="Heure"><input value={f.time} onChange={(e) => set("time", e.target.value)} /></Field>
        <Field label="Capacité"><input type="number" min={2} value={f.capacity} onChange={(e) => set("capacity", Number(e.target.value))} /></Field>
        <Field label="Droits d'entrée (€)"><input type="number" min={0} value={f.entryFee} onChange={(e) => set("entryFee", Number(e.target.value))} /></Field>
        <Field label="Format">
          <select value={f.format} onChange={(e) => set("format", e.target.value)}>
            <option>Simple élimination</option><option>Double élimination</option><option>Round robin</option>
          </select>
        </Field>
        <Field label="Statut">
          <select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="open">Inscriptions ouvertes</option><option value="live">En cours</option><option value="done">Terminé</option>
          </select>
        </Field>
        <Field label="Lieu"><input value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Salle / bar" /></Field>
        <div className="dialog-foot">
          <Button kind="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit"><Icon name="check" />{existing ? "Enregistrer" : "Créer"}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ----------------------------- registration table -------------------------- */

function RegistrationTable({ t, reload }: { t: Tournament; reload: () => void }) {
  const [name, setName] = useState("")
  const [character, setCharacter] = useState("")
  const [q, setQ] = useState("")
  const [error, setError] = useState("")
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api.addPlayer(t.id, { name, character: character || "—" })
      setName(""); setCharacter(""); setError(""); reload()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  const toggle = (p: Player, field: "paid" | "checkedIn") => api.patchPlayer(t.id, p.id, { [field]: !p[field] }).then(reload)
  const filtered = t.players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.character.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="panel">
      <div className="panel-head stack">
        <div className="panel-head-row">
          <div><h2>{t.players.length} inscrits</h2><p>{t.capacity - t.players.length} places restantes · {t.entryFee}€ / joueur</p></div>
          <div className="header-actions">
            <Button kind="secondary" onClick={() => api.checkInAll(t.id).then(reload)} disabled={!t.players.length}><Icon name="check" />Check-in tous</Button>
          </div>
        </div>
        <form className="add-form" onSubmit={add}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Joueur" maxLength={40} autoFocus />
          <input value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="Personnage" maxLength={40} />
          <Button type="submit" disabled={!name.trim()}><Icon name="plus" />Inscrire</Button>
        </form>
        {error && <div className="form-error"><Icon name="close" size={13} />{error}</div>}
      </div>
      <div className="panel-sub">
        <div className="search-box"><Icon name="search" size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un joueur…" /></div>
        <span className="muted">{filtered.length} affichés</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Joueur</th><th>Personnage</th><th>Paiement</th><th>Check-in</th><th /></tr></thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id}>
                <td className="muted">{p.seed ?? i + 1}</td>
                <td><div className="player"><span className="avatar">{p.name.slice(0, 2).toUpperCase()}</span><strong>{p.name}</strong></div></td>
                <td>{p.character}</td>
                <td><button className="chip-toggle" onClick={() => toggle(p, "paid")}><Badge tone={p.paid ? "success" : "danger"}>{p.paid ? "Payé" : "Impayé"}</Badge></button></td>
                <td><button className="chip-toggle" onClick={() => toggle(p, "checkedIn")}><Badge tone={p.checkedIn ? "cyan" : "muted"}>{p.checkedIn ? "Présent" : "En attente"}</Badge></button></td>
                <td><button className="row-del" onClick={() => api.removePlayer(t.id, p.id).then(reload)} aria-label="Supprimer"><Icon name="close" size={14} /></button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="muted" colSpan={6}>Aucun joueur.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* --------------------------------- bracket -------------------------------- */

function MatchCell({ m, onReport, onAssign }: { m: Match; onReport?: (m: Match) => void; onAssign?: (m: Match) => void }) {
  const hasScore = m.scoreA || m.scoreB
  return (
    <div className={`match-cell ${m.live ? "live" : ""}`}>
      <div className="match-label">
        {m.live ? <span>EN COURS</span> : <span>{m.round.toUpperCase()}</span>}
        {m.setup && <em>SETUP {m.setup}</em>}
      </div>
      <div className={`match-player ${m.winner === 1 || (!m.winner && m.scoreA > m.scoreB && hasScore) ? "winner" : ""}`}><span>{m.playerA}</span><strong>{m.scoreA}</strong></div>
      <div className={`match-player ${m.winner === 2 || (!m.winner && m.scoreB > m.scoreA && hasScore) ? "winner" : ""}`}><span>{m.playerB}</span><strong>{m.scoreB}</strong></div>
      <div className="match-actions">
        {onAssign && <button className="icon-btn sm" title="Assigner un setup" onClick={() => onAssign(m)}><Icon name="link" size={13} /></button>}
        {onReport && <button className="icon-btn sm" title="Reporter le score" onClick={() => onReport(m)}><Icon name="edit" size={13} /></button>}
      </div>
    </div>
  )
}

function Bracket({ t, onReport, onAssign }: { t: Tournament; onReport?: (m: Match) => void; onAssign?: (m: Match) => void }) {
  const rounds = [...new Set(t.matches.map((m) => m.round))]
  return (
    <div className="bracket">
      {rounds.map((r, i) => (
        <div className={`bracket-column ${i === rounds.length - 1 ? "final" : ""} ${i > 0 ? "spaced" : ""}`} key={r}>
          <h4>{r.toUpperCase()}</h4>
          {t.matches.filter((m) => m.round === r).map((m) => <MatchCell key={m.id} m={m} onReport={onReport} onAssign={onAssign} />)}
        </div>
      ))}
    </div>
  )
}

function ReportDialog({ t, match, onClose, onDone }: { t: Tournament; match: Match; onClose: () => void; onDone: () => void }) {
  const [a, setA] = useState(match.scoreA)
  const [b, setB] = useState(match.scoreB)
  const [winner, setWinner] = useState<"A" | "B">(match.scoreA > match.scoreB ? "A" : match.scoreB > match.scoreA ? "B" : "A")
  const submit = async () => {
    await api.patchMatch(t.id, match.id, {
      scoreA: winner === "A" ? a : b, scoreB: winner === "A" ? b : a, live: false,
      winner: winner === "A" ? 1 : 2,
    })
    onDone(); onClose()
  }
  return (
    <Modal title="Reporter le score" onClose={onClose}>
      <div className="dialog-body">
        <Field label="Vainqueur">
          <div className="winner-options">
            <button className={winner === "A" ? "selected" : ""} onClick={() => setWinner("A")}>{match.playerA}</button>
            <button className={winner === "B" ? "selected" : ""} onClick={() => setWinner("B")}>{match.playerB}</button>
          </div>
        </Field>
        <Field label="Score">
          <div className="score-input">
            <div className="score-side">
              <button onClick={() => setA((n) => Math.max(0, n - 1))} title="−1">−</button>
              <strong>{winner === "A" ? a : b}</strong>
              <button onClick={() => setA((n) => n + 1)} title="+1">+</button>
            </div>
            <span className="score-sep">—</span>
            <div className="score-side">
              <button onClick={() => setB((n) => Math.max(0, n - 1))} title="−1">−</button>
              <strong>{winner === "A" ? b : a}</strong>
              <button onClick={() => setB((n) => n + 1)} title="+1">+</button>
            </div>
          </div>
        </Field>
      </div>
      <div className="dialog-foot"><Button kind="secondary" onClick={onClose}>Annuler</Button><Button onClick={submit}><Icon name="check" />Valider</Button></div>
    </Modal>
  )
}

function AssignDialog({ t, match, onClose, onDone }: { t: Tournament; match: Match; onClose: () => void; onDone: () => void }) {
  const free = t.setups.filter((s) => s.status === "free")
  const [sid, setSid] = useState(match.setup ?? free[0]?.id ?? "")
  const submit = async () => {
    const setup = t.setups.find((s) => s.id === sid)
    const label = setup ? `${match.playerA} vs ${match.playerB}` : ""
    await api.patchMatch(t.id, match.id, { setup: sid || null, live: Boolean(sid) })
    // free the previous setup, occupy the new one
    if (match.setup) { const prev = t.setups.find((s) => s.id === match.setup); if (prev) await api.patchSetup(t.id, prev.id, { status: "free", currentMatch: null }) }
    if (setup) await api.patchSetup(t.id, setup.id, { status: "busy", currentMatch: label })
    onDone(); onClose()
  }
  const clear = async () => {
    await api.patchMatch(t.id, match.id, { setup: null, live: false })
    if (match.setup) { const prev = t.setups.find((s) => s.id === match.setup); if (prev) await api.patchSetup(t.id, prev.id, { status: "free", currentMatch: null }) }
    onDone(); onClose()
  }
  return (
    <Modal title="Assigner à un setup" onClose={onClose}>
      <div className="dialog-body">
        <Field label="Setup disponible">
          <select value={sid} onChange={(e) => setSid(e.target.value)} className="select-full">
            {free.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.hardware}</option>)}
            {!free.length && !match.setup && <option value="">(aucun)</option>}
          </select>
        </Field>
        {!free.length && match.setup ? <p className="muted">Aucun setup libre. Libérez-en un ou désassignez ce match.</p> : null}
      </div>
      <div className="dialog-foot">
        {match.setup && <Button kind="danger" onClick={clear}>Désassigner</Button>}
        <div className="spacer" />
        <Button kind="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={submit} disabled={!sid}><Icon name="link" />Assigner</Button>
      </div>
    </Modal>
  )
}

/* --------------------------------- setups --------------------------------- */

function Setups({ t, reload }: { t: Tournament; reload: () => void }) {
  const toggle = (s: Setup) => api.patchSetup(t.id, s.id, { status: s.status === "free" ? "busy" : "free", currentMatch: s.status === "free" ? s.currentMatch : null }).then(reload)
  return (
    <div className="setup-grid">
      {t.setups.map((s) => (
        <div className="setup-card" key={s.id}>
          <div className="setup-head"><span className="setup-num">{s.id.replace("s-", "#")}</span><Badge tone={s.status === "busy" ? "warning" : "success"}>{s.status === "busy" ? "Occupé" : "Libre"}</Badge></div>
          <h3>{s.label}</h3><p>{s.hardware}</p>
          {s.currentMatch && <div className="current-match">{s.currentMatch}</div>}
          <button className="link-btn" onClick={() => toggle(s)}>Marquer {s.status === "free" ? "occupé" : "libre"}</button>
        </div>
      ))}
      {!t.setups.length && <p className="muted">Aucun setup. Générez un bracket puis assignez les matchs.</p>}
    </div>
  )
}

/* ----------------------------- tournament detail --------------------------- */

function TournamentDetail({ id, toNeeds, toPlanning }: { id: string; toNeeds: () => void; toPlanning: () => void }) {
  const { data, loading, reload } = useTournament(id)
  const [tab, setTab] = useState<DetailTab>("Inscriptions")
  const [report, setReport] = useState<Match | null>(null)
  const [assign, setAssign] = useState<Match | null>(null)

  if (loading || !data) return <div className="page"><div className="skeleton line-skel" /></div>
  const t = data
  const deficitCount = t.needs.filter((n) => !n.resolved && n.gross - n.stock - n.recoverable > 0).length
  const liveMatch = t.matches.find((m) => m.live)

  return (
    <div className="page">
      <Header eyebrow="Tournois" title={t.title}>
        <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
        {liveMatch && <Badge tone="warning"><Icon name="radio" size={11} />Match en cours</Badge>}
      </Header>
      <div className="event-summary">
        <div><span>DATE</span><strong>{t.date || "—"}</strong></div>
        <div><span>JEU</span><strong>{t.game}</strong></div>
        <div><span>FORMAT</span><strong>{t.format}</strong></div>
        <div><span>INSCRITS</span><strong>{t.players.length} / {t.capacity}</strong></div>
        <div><span>ENTRÉE</span><strong>{t.entryFee} €</strong></div>
      </div>
      <div className="tabs">
        {(["Inscriptions", "Bracket", "Setups", "Besoins & matériel"] as DetailTab[]).map((tb) => (
          <button key={tb} className={tab === tb ? "active" : ""} onClick={() => setTab(tb)}>
            {tb}{tb === "Besoins & matériel" && deficitCount > 0 && <span className="tab-alert">{deficitCount}</span>}
          </button>
        ))}
      </div>
      {tab === "Inscriptions" && <RegistrationTable t={t} reload={reload} />}
      {tab === "Bracket" && (
        <div className="panel bracket-panel">
          <div className="panel-head">
            <div><h2>Bracket</h2><p>{t.format}{liveMatch ? " · 1 match en cours" : ""}</p></div>
            <div className="header-actions">
              <Button kind="secondary" onClick={() => {
                if (t.players.length < 2) return alert("Il faut au moins 2 joueurs.")
                if (t.matches.length && !confirm("Regénérer le bracket ? Les scores actuels seront perdus.")) return
                api.generateBracket(t.id).then(reload)
              }}><Icon name="refresh" />Générer le bracket</Button>
            </div>
          </div>
          {t.matches.length
            ? <Bracket t={t} onReport={(m) => setReport(m)} onAssign={(m) => setAssign(m)} />
            : <div className="empty-state"><p>Aucun match. Générez le bracket à partir des inscrits.</p><Button onClick={() => api.generateBracket(t.id).then(reload)}><Icon name="play" />Générer</Button></div>}
        </div>
      )}
      {tab === "Setups" && <Setups t={t} reload={reload} />}
      {tab === "Besoins & matériel" && (
        <div className="panel material-callout">
          <Icon name="box" size={28} />
          <div><h2>{deficitCount} besoin{deficitCount > 1 ? "s" : ""} à couvrir</h2><p>Ouvrez le calcul MRP pour gérer le matériel.</p></div>
          <div className="spacer" />
          <Button kind="secondary" onClick={toNeeds}>Ouvrir le calcul</Button>
        </div>
      )}
      {report && <ReportDialog t={t} match={report} onClose={() => setReport(null)} onDone={reload} />}
      {assign && <AssignDialog t={t} match={assign} onClose={() => setAssign(null)} onDone={reload} />}
      {tab === "Bracket" && t.tasks.length === 0 && <div className="hint-row"><span className="muted">Astuce : préparez l'événement depuis le</span><button className="link-btn inline" onClick={toPlanning}>rétroplanning</button></div>}
    </div>
  )
}

/* ---------------------------------- needs --------------------------------- */

function Needs({ id }: { id: string }) {
  const { data, loading, reload } = useTournament(id)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Need | null>(null)
  if (loading || !data) return <div className="page"><div className="skeleton line-skel" /></div>
  const t = data
  const net = (n: Need) => Math.max(0, n.gross - n.stock - n.recoverable)
  const openDeficits = t.needs.filter((n) => !n.resolved && net(n) > 0).length
  const totalNet = t.needs.filter((n) => !n.resolved).reduce((acc, n) => acc + net(n), 0)

  return (
    <div className="page">
      <Header eyebrow={`${t.title} / Planification`} title="Besoins & matériel">
        <Button kind="secondary" onClick={() => setAdding(true)}><Icon name="plus" />Ajouter</Button>
      </Header>
      <div className="needs-banner">
        <div><h3>Calcul pour {t.setups.length} stations</h3><p>{t.players.length} joueurs · {t.date}</p></div>
        <div className="net-total"><span>BESOIN NET</span><strong>{totalNet} articles</strong></div>
      </div>
      <div className="panel needs-table">
        <div className="panel-head"><div><h2>Plan d'approvisionnement</h2><p>{openDeficits} déficit{openDeficits > 1 ? "s" : ""} ouvert{openDeficits > 1 ? "s" : ""}</p></div><Badge tone={openDeficits ? "danger" : "success"}>{openDeficits ? `${openDeficits} à couvrir` : "Couvert"}</Badge></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Article</th><th>Besoin</th><th>Stock</th><th>Récup.</th><th>Net</th><th>Action</th><th>Avant</th><th>État</th><th /></tr></thead>
            <tbody>
              {t.needs.map((n) => {
                const nn = net(n)
                const covered = nn === 0 || n.resolved
                return (
                  <tr className={covered ? "covered" : "deficit"} key={n.id}>
                    <td><strong>{n.item}</strong></td>
                    <td>{n.gross}</td><td>{n.stock}</td><td>{n.recoverable}</td>
                    <td><strong className="net-value">{nn}</strong></td>
                    <td><span className="action-label">{covered && <Icon name="check" size={13} />}{n.action}</span></td>
                    <td>{n.deadline}</td>
                    <td><button className="chip-toggle" onClick={() => api.patchNeed(t.id, n.id, { resolved: !n.resolved }).then(reload)}><Badge tone={n.resolved ? "success" : nn === 0 ? "muted" : "danger"}>{n.resolved ? "Résolu" : nn === 0 ? "Couvert" : "Ouvert"}</Badge></button></td>
                    <td className="row-actions">
                  <button className="row-del" title="Modifier" onClick={() => setEditing(n)}><Icon name="edit" size={14} /></button>
                  <button className="row-del" title="Supprimer" onClick={() => api.removeNeed(t.id, n.id).then(reload)}><Icon name="trash" size={14} /></button>
                </td>
                  </tr>
                )
              })}
              {!t.needs.length && <tr><td className="muted" colSpan={9}>Aucun besoin déclaré.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {adding && <NeedForm tid={t.id} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload() }} />}
      {editing && <NeedForm tid={t.id} existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload() }} />}
    </div>
  )
}

function NeedForm({ tid, existing, onClose, onDone }: { tid: string; existing?: Need; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    item: existing?.item ?? "",
    gross: existing?.gross ?? 1,
    stock: existing?.stock ?? 0,
    recoverable: existing?.recoverable ?? 0,
    action: existing?.action ?? "",
    deadline: existing?.deadline ?? "—",
  })
  const [error, setError] = useState("")
  const set = (k: string, v: string | number) => setF((s) => ({ ...s, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.item.trim()) return
    try {
      if (existing) await api.patchNeed(tid, existing.id, f)
      else await api.addNeed(tid, f)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <Modal title={existing ? "Modifier le besoin" : "Ajouter un besoin"} onClose={onClose}>
      <form className="dialog-body grid-form" onSubmit={submit}>
        <Field label="Article"><input value={f.item} onChange={(e) => set("item", e.target.value)} autoFocus /></Field>
        <Field label="Besoin brut"><input type="number" min={0} value={f.gross} onChange={(e) => set("gross", Number(e.target.value))} /></Field>
        <Field label="Stock ludothèque"><input type="number" min={0} value={f.stock} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
        <Field label="Récupérable"><input type="number" min={0} value={f.recoverable} onChange={(e) => set("recoverable", Number(e.target.value))} /></Field>
        <Field label="Action proposée"><input value={f.action} onChange={(e) => set("action", e.target.value)} /></Field>
        <Field label="À lancer avant"><input value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        {error && <div className="form-error grid-span"><Icon name="close" size={13} />{error}</div>}
        <div className="dialog-foot"><Button kind="secondary" onClick={onClose}>Annuler</Button><Button type="submit"><Icon name={existing ? "check" : "plus"} />{existing ? "Enregistrer" : "Ajouter"}</Button></div>
      </form>
    </Modal>
  )
}

/* -------------------------------- planning -------------------------------- */

function Planning({ id }: { id: string }) {
  const { data, loading, reload } = useTournament(id)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  if (loading || !data) return <div className="page"><div className="skeleton line-skel" /></div>
  const t = data
  const doneCount = t.tasks.filter((x) => x.done).length
  const pct = t.tasks.length ? Math.round((doneCount / t.tasks.length) * 100) : 0
  const toggle = (task: Task) => api.patchTask(t.id, task.id, { done: !task.done }).then(reload)
  const del = (task: Task) => api.removeTask(t.id, task.id).then(reload)
  return (
    <div className="page planning-page">
      <Header eyebrow={`${t.title} / Préparation`} title="Rétroplanning">
        <div className="completion"><strong>{doneCount} / {t.tasks.length}</strong><span>tâches terminées</span></div>
        <Button onClick={() => setAdding(true)}><Icon name="plus" />Tâche</Button>
      </Header>
      <div className="planning-layout">
        <div className="timeline-panel">
          {t.tasks.map((task) => (
            <div className={`timeline-task ${task.done ? "done" : ""} ${task.event ? "event" : ""}`} key={task.id}>
              <div className="timeline-date"><strong>{task.milestone}</strong><span>{task.date}</span></div>
              <button className="task-check" onClick={() => toggle(task)}>{task.done && <Icon name="check" size={13} />}</button>
              <div className="task-card">
                <div><h3>{task.label}</h3><p>Responsable · {task.owner}</p></div>
                <div className="task-card-actions">
                  <Badge tone={task.done ? "success" : task.event ? "purple" : "muted"}>{task.done ? "Fait" : task.event ? "Événement" : "À faire"}</Badge>
                  <button className="icon-btn sm" onClick={() => setEditing(task)} title="Modifier"><Icon name="edit" size={13} /></button>
                  <button className="icon-btn sm" onClick={() => del(task)} title="Supprimer"><Icon name="trash" size={13} /></button>
                </div>
              </div>
            </div>
          ))}
          {!t.tasks.length && <p className="muted">Aucune tâche. Ajoutez les étapes de préparation.</p>}
        </div>
        <aside className="side-summary">
          <h3>Progression</h3>
          <div className="donut" style={{ background: `radial-gradient(circle at center, var(--panel) 59%, transparent 60%), conic-gradient(var(--purple) 0 ${pct}%, #292d35 ${pct}%)` }}>
            <strong>{pct}%</strong><span>terminé</span>
          </div>
          <div className="summary-row"><span><i className="purple-dot" />À faire</span><strong>{t.tasks.length - doneCount}</strong></div>
          <div className="summary-row"><span><i className="green-dot" />Terminé</span><strong>{doneCount}</strong></div>
          <hr />
          <h3>Prochaine échéance</h3>
          <p className="deadline">{t.tasks.find((x) => !x.done)?.label ?? "—"}</p>
        </aside>
      </div>
      {adding && <TaskForm tid={t.id} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload() }} />}
      {editing && <TaskForm tid={t.id} existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload() }} />}
    </div>
  )
}

function TaskForm({ tid, existing, onClose, onDone }: { tid: string; existing?: Task; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    label: existing?.label ?? "",
    owner: existing?.owner ?? "",
    milestone: existing?.milestone ?? "J0",
    date: existing?.date ?? "—",
    event: existing?.event ?? false,
  })
  const [error, setError] = useState("")
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.label.trim()) return
    try {
      if (existing) await api.patchTask(tid, existing.id, f)
      else await api.addTask(tid, f)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <Modal title={existing ? "Modifier la tâche" : "Ajouter une tâche"} onClose={onClose}>
      <form className="dialog-body grid-form" onSubmit={submit}>
        <Field label="Tâche"><input value={f.label} onChange={(e) => set("label", e.target.value)} autoFocus /></Field>
        <Field label="Responsable"><input value={f.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Nora" /></Field>
        <Field label="Jalon"><input value={f.milestone} onChange={(e) => set("milestone", e.target.value)} placeholder="J-7" /></Field>
        <Field label="Date"><input value={f.date} onChange={(e) => set("date", e.target.value)} placeholder="15 nov." /></Field>
        <label className="field check-field"><input type="checkbox" checked={f.event} onChange={(e) => set("event", e.target.checked)} /><span>Jour de l'événement</span></label>
        {error && <div className="form-error grid-span"><Icon name="close" size={13} />{error}</div>}
        <div className="dialog-foot"><Button kind="secondary" onClick={onClose}>Annuler</Button><Button type="submit"><Icon name={existing ? "check" : "plus"} />{existing ? "Enregistrer" : "Ajouter"}</Button></div>
      </form>
    </Modal>
  )
}

/* ------------------------------ public bracket ---------------------------- */

function PublicBracket({ id }: { id: string }) {
  const { data, loading } = useTournament(id)
  const live = data?.matches.find((m) => m.live)
  return (
    <div className="public-page">
      <div className="public-top">
        <div className="public-brand"><span className="brand-mark"><Icon name="trophy" size={16} /></span><span>FGC LYON</span></div>
        <Badge tone="cyan"><Icon name="radio" size={12} />DIRECT</Badge>
      </div>
      <div className="public-title">
        <div>
          <span>{data?.game?.toUpperCase()} · {data?.format?.toUpperCase()}</span>
          <h1>{data?.title}</h1>
          <p>{data?.date} · {data?.venue}</p>
        </div>
        {live && (
          <div className="live-card">
            <span>MAINTENANT · SETUP {live.setup}</span>
            <strong>{live.playerA} <i>{live.scoreA} — {live.scoreB}</i> {live.playerB}</strong>
          </div>
        )}
      </div>
      {loading || !data ? <div className="skeleton line-skel" /> : data.matches.length ? <Bracket t={data} /> : <p className="muted">Bracket non disponible.</p>}
      <div className="public-footer"><span>Scores mis à jour automatiquement</span><span>fgc-lyon.fr</span></div>
    </div>
  )
}

/* ------------------------------ mobile console ----------------------------- */

function MobileConsole({ id, page, setPage }: { id: string; page: Page; setPage: (p: Page) => void }) {
  const [tab, setTab] = useState<MobileTab>("Inscrits")
  const { data, reload } = useTournament(id)
  if (!data) return <div className="mobile-console"><div className="skeleton line-skel" /></div>
  const t = data
  const present = t.players.filter((p) => p.checkedIn)
  const unpaid = t.players.filter((p) => !p.paid)
  const collected = t.players.filter((p) => p.paid).length * t.entryFee
  const toggleIn = (p: Player) => api.patchPlayer(t.id, p.id, { checkedIn: !p.checkedIn }).then(reload)
  const togglePay = (p: Player) => api.patchPlayer(t.id, p.id, { paid: !p.paid }).then(reload)

  return (
    <div className="mobile-console">
      <header className="mobile-header">
        <div><p>{t.title.toUpperCase()}</p><h1>{tab}</h1></div>
        <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
      </header>
      <main className="mobile-content">
        {tab === "Inscrits" && (
          <>
            <div className="mobile-stat">
              <div><strong>{present.length}<span>/{t.players.length}</span></strong><p>joueurs présents</p></div>
              <div className="mini-ring">{t.players.length ? Math.round((present.length / t.players.length) * 100) : 0}%</div>
            </div>
            <div className="mobile-section-title"><h2>Check-in</h2><button className="link-btn" onClick={() => api.checkInAll(t.id).then(reload)}>Tous</button></div>
            <div className="checkin-list">
              {t.players.slice(0, 12).map((p) => (
                <button key={p.id} className={`checkin-row ${p.checkedIn ? "checked" : ""}`} onClick={() => toggleIn(p)}>
                  <span className="avatar">{p.name.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{p.name}</strong><small>{p.character}</small></span>
                  <i>{p.checkedIn && <Icon name="check" size={14} />}</i>
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "Bracket" && <div className="panel bracket-panel">{t.matches.length ? <Bracket t={t} /> : <p className="muted">Bracket non généré.</p>}</div>}
        {tab === "Setups" && <Setups t={t} reload={reload} />}
        {tab === "Paiements" && (
          <>
            <div className="mobile-stat"><div><strong>{collected} €</strong><p>encaissés</p></div><Badge tone={unpaid.length ? "danger" : "success"}>{unpaid.length} impayé{unpaid.length > 1 ? "s" : ""}</Badge></div>
            <div className="checkin-list">
              {t.players.slice(0, 12).map((p) => (
                <button className="payment-row" key={p.id} onClick={() => togglePay(p)}>
                  <span className="avatar">{p.name.slice(0, 2).toUpperCase()}</span>
                  <strong>{p.name}</strong>
                  <Badge tone={p.paid ? "success" : "danger"}>{p.paid ? `${t.entryFee}€ payé` : "Impayé"}</Badge>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
      <nav className="mobile-nav">
        {(["Inscrits", "Bracket", "Setups", "Paiements"] as MobileTab[]).map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>
            <Icon name={item === "Inscrits" ? "users" : item === "Bracket" ? "trophy" : item === "Setups" ? "box" : "coin"} />
            <span>{item}</span>
          </button>
        ))}
      </nav>
      <button className="mobile-switch" onClick={() => setPage("dashboard")}>Vue bureau</button>
    </div>
  )
}

/* ----------------------------------- app ----------------------------------- */

export default function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [activeId, setActiveId] = useState<string>("clash-lyonnais-12")
  const nav: [Page, string, string][] = [
    ["dashboard", "grid", "Vue d'ensemble"],
    ["tournament", "trophy", "Tournois"],
    ["needs", "box", "Matériel & MRP"],
    ["planning", "calendar", "Rétroplanning"],
    ["public", "radio", "Vue publique"],
  ]
  const openTournament = (id: string) => { setActiveId(id); setPage("tournament") }
  const content =
    page === "dashboard" ? <Dashboard openTournament={openTournament} />
    : page === "tournament" ? <TournamentDetail id={activeId} toNeeds={() => setPage("needs")} toPlanning={() => setPage("planning")} />
    : page === "needs" ? <Needs id={activeId} />
    : page === "planning" ? <Planning id={activeId} />
    : <PublicBracket id={activeId} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="trophy" size={18} /></span>
          <div><strong>RING CTRL</strong><span>ERP</span></div>
        </div>
        <nav>
          {nav.map(([id, icon, label]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
              <Icon name={icon} />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="reset-btn" onClick={() => { if (confirm("Réinitialiser toutes les données de démo ?")) { api.reset().then(() => location.reload()) } }}>
            <Icon name="refresh" size={14} />Réinitialiser la démo
          </button>
          <div className="profile">
            <span className="avatar">NA</span>
            <div><strong>Nora A.</strong><small>Administratrice</small></div>
          </div>
        </div>
      </aside>
      <div className="desktop-content">
        <div className="topbar">
          <span>FGC Lyon</span>
          <Badge tone="cyan"><Icon name="radio" size={12} />Opérationnel</Badge>
        </div>
        {content}
      </div>
      <div className="mobile-only">
        {page === "public" ? <PublicBracket id={activeId} /> : <MobileConsole id={activeId} page={page} setPage={setPage} />}
      </div>
    </div>
  )
}
