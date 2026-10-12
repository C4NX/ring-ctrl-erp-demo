// Seed data shared between the JSON fallback and the Prisma seeding.
// Kept as plain serializable records so it can drive either backend.

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface SeedTournament {
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
  players: { id: string; name: string; character: string; paid: boolean; checkedIn: boolean; seed?: number }[]
  matches: {
    id: string
    round: string
    playerA: string
    playerB: string
    scoreA: number
    scoreB: number
    live: boolean
    setup?: string
    winner?: number
  }[]
  setups: { id: string; label: string; hardware: string; status: 'free' | 'busy'; currentMatch?: string }[]
  needs: {
    id: string
    item: string
    gross: number
    stock: number
    recoverable: number
    action: string
    deadline: string
    resolved?: boolean
  }[]
  tasks: {
    id: string
    milestone: string
    date: string
    label: string
    owner: string
    done: boolean
    event: boolean
  }[]
}

function mainTournament(): SeedTournament {
  const players = [
    ['Kayane', 'Chun-Li', true, true],
    ['Gen1us', 'Ken', true, true],
    ['Takamitsu', 'Jin', true, true],
    ['Mister Crimson', 'Dhalsim', false, true],
    ['Super Akouma', 'Akuma', true, false],
    ['Valmaster', 'Kimberly', false, false],
    ['Skyll', 'Luke', true, false],
    ['Kusanagi', 'Ryu', true, false],
    ['Phenom', 'Cammy', true, false],
    ['Problem X', 'Guile', true, false],
    ['Snake Eyez', 'Zangief', true, false],
    ['Punk', 'Juri', true, false],
    ['MenaRD', 'Blanka', true, false],
    ['Big Bird', 'Rashid', true, false],
    ['AngryBird', 'Marisa', true, false],
    ['Luffy', 'DJ', false, false],
    ['Xian', 'A.K.I.', true, false],
    ['Fuudo', 'E.Honda', true, false],
    ['Tokido', 'Ryu', true, false],
    ['Bonchan', 'Sagat', true, false],
    ['Mochi', 'Lily', true, false],
    ['Itabashi Zaxus', 'Gief', true, false],
    ['GO1', 'JP', true, false],
    ['Dogura', 'Ed', true, false],
  ].map(([name, character, paid, checkedIn], i) => ({
    id: slug(String(name)),
    name: String(name),
    character: String(character),
    paid: Boolean(paid),
    checkedIn: Boolean(checkedIn),
    seed: i + 1,
  }))

  const matches = [
    { id: 'm-q1', round: 'Quarts de finale', playerA: 'Kayane', playerB: 'Kusanagi', scoreA: 2, scoreB: 0, live: false, setup: '02', winner: 1 },
    { id: 'm-q2', round: 'Quarts de finale', playerA: 'Gen1us', playerB: 'Skyll', scoreA: 2, scoreB: 1, live: false, setup: '04', winner: 1 },
    { id: 'm-q3', round: 'Quarts de finale', playerA: 'Takamitsu', playerB: 'Valmaster', scoreA: 2, scoreB: 0, live: false, setup: '01', winner: 1 },
    { id: 'm-q4', round: 'Quarts de finale', playerA: 'Super Akouma', playerB: 'Mister Crimson', scoreA: 2, scoreB: 1, live: false, setup: '06', winner: 1 },
    { id: 'm-s1', round: 'Demi-finales', playerA: 'Kayane', playerB: 'Gen1us', scoreA: 2, scoreB: 1, live: false, setup: '02', winner: 1 },
    { id: 'm-s2', round: 'Demi-finales', playerA: 'Takamitsu', playerB: 'Super Akouma', scoreA: 1, scoreB: 1, live: true, setup: '03', winner: 0 },
    { id: 'm-f', round: 'Finale winners', playerA: 'Kayane', playerB: 'À déterminer', scoreA: 0, scoreB: 0, live: false, winner: 0 },
  ]

  const setups: SeedTournament['setups'] = Array.from({ length: 8 }, (_, i) => ({
    id: `s-${i + 1}`,
    label: `Setup ${i + 1}`,
    hardware: i % 2 === 0 ? 'PS5 · Écran 24″' : 'PS5 · Écran 27″',
    status: i === 2 || i === 5 ? 'busy' : 'free',
    currentMatch: i === 2 ? 'Takamitsu vs Super Akouma' : undefined,
  }))

  const needs = [
    ['Consoles PS5', 8, 4, 2, 'Emprunter 2 à l’asso partenaire', '12/11'],
    ['Écrans 24–27″', 8, 5, 0, 'Acheter 3', '15/11'],
    ['Manettes', 16, 10, 0, 'Acheter 6', '15/11'],
    ['Jeux Street Fighter 6', 8, 3, 0, 'Acheter 5', '15/11'],
    ['Câbles HDMI', 8, 8, 0, 'Couvert par le stock', '—'],
    ['Multiprises', 8, 6, 2, 'Rappeler 2 prêts membres', '12/11'],
  ].map(([item, gross, stock, recoverable, action, deadline]) => ({
    id: slug(String(item)),
    item: String(item),
    gross: Number(gross),
    stock: Number(stock),
    recoverable: Number(recoverable),
    action: String(action),
    deadline: String(deadline),
    resolved: false,
  }))

  const tasks = [
    ['J-30', '23 oct.', 'Réserver la salle', 'Nora', true, false],
    ['J-21', '1 nov.', 'Ouvrir les inscriptions', 'Alex', true, false],
    ['J-15', '7 nov.', 'Lancer les achats matériel', 'Samir', false, false],
    ['J-10', '12 nov.', 'Relancer les prêts membres', 'Nora', false, false],
    ['J-1', '21 nov.', 'Installer et tester les setups', 'Équipe TO', false, false],
    ['J0', '22 nov.', 'Clash Lyonnais #12', 'Équipe TO', false, true],
    ['J+3', '25 nov.', 'Retourner les prêts', 'Samir', false, false],
  ].map(([milestone, date, label, owner, done, event]) => ({
    id: slug(String(milestone)),
    milestone: String(milestone),
    date: String(date),
    label: String(label),
    owner: String(owner),
    done: Boolean(done),
    event: Boolean(event),
  }))

  return {
    id: 'clash-lyonnais-12',
    title: 'Clash Lyonnais #12',
    game: 'Street Fighter 6',
    date: 'Samedi 22 novembre',
    time: '13:30',
    capacity: 32,
    format: 'Double élimination',
    status: 'open',
    entryFee: 10,
    venue: 'Salle des fêtes de Lyon',
    players,
    matches,
    setups,
    needs,
    tasks,
  }
}

export function seedTournaments(): SeedTournament[] {
  return [
    mainTournament(),
    {
      id: 'iron-fist-weekly',
      title: 'Iron Fist Weekly',
      game: 'Tekken 8',
      date: 'Jeudi 27 novembre',
      time: '19:00',
      capacity: 24,
      format: 'Simple élimination',
      status: 'open',
      entryFee: 5,
      venue: 'Bar Le Verso',
      players: [],
      matches: [],
      setups: [],
      needs: [],
      tasks: [],
    },
    {
      id: 'fight-night-08',
      title: 'Fight Night #08',
      game: 'Street Fighter 6',
      date: 'Vendredi 14 novembre',
      time: '20:00',
      capacity: 32,
      format: 'Double élimination',
      status: 'live',
      entryFee: 10,
      venue: 'Salle des fêtes de Lyon',
      players: [],
      matches: [],
      setups: [],
      needs: [],
      tasks: [],
    },
    {
      id: 'rookie-rumble',
      title: 'Rookie Rumble',
      game: 'Tekken 8',
      date: 'Samedi 8 novembre',
      time: '14:00',
      capacity: 16,
      format: 'Simple élimination',
      status: 'done',
      entryFee: 5,
      venue: 'MJC de Villeurbanne',
      players: [],
      matches: [],
      setups: [],
      needs: [],
      tasks: [],
    },
  ]
}

export { slug }
