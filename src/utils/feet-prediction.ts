import { type Chart, NOTE_TYPES } from '../types/chart'

type Foot = 'L' | 'R'

interface ChartRow {
  time: number
  required: Set<number>
  holds: Set<number>
  starts: Set<number>
  ends: Set<number>
}

export interface PredictionState {
  time: number
  L: number[]
  R: number[]
}

type PadIndex = Set<number> | null

interface FootStance {
  L: PadIndex
  R: PadIndex
}

interface InternalState {
  time: number
  L: PadIndex
  R: PadIndex
  footStance: FootStance & {
    Lt: number
    Rt: number
  }
  holdOwners: Map<number, Foot>
  totalCost: number
  prev: InternalState | null
  angle: number
  angleDelta: number
}

export const padPositions = [
  { x: -1, y: -1 + 0.125 },
  { x: -1, y: 1 - 0.125 },
  { x: 0, y: 0 },
  { x: 1, y: 1 - 0.125 },
  { x: 1, y: -1 + 0.125 },
  { x: 2, y: -1 + 0.125 },
  { x: 2, y: 1 - 0.125 },
  { x: 3, y: 0 },
  { x: 4, y: 1 - 0.125 },
  { x: 4, y: -1 + 0.125 },
]

const buildChartRows = (chart: Chart): ChartRow[] => {
  const notes = chart.blocks.flatMap(block => block.notes).sort((a, b) => a.time - b.time)

  const rows: ChartRow[] = []
  const currentHolds = new Set<number>()

  let i = 0

  while (i < notes.length) {
    const time = notes[i].time
    const required = new Set<number>()
    const starts = new Set<number>()
    const ends = new Set<number>()

    while (i < notes.length && notes[i].time === time) {
      const note = notes[i]

      if (note.type === NOTE_TYPES.Normal) {
        required.add(note.padIndex)
      }

      if (note.type === NOTE_TYPES.LongStart) {
        required.add(note.padIndex)
        starts.add(note.padIndex)
      }

      if (note.type === NOTE_TYPES.LongEnd) {
        ends.add(note.padIndex)
      }

      i++
    }

    rows.push({
      time,
      required,
      holds: new Set(currentHolds),
      starts,
      ends
    })

    for (const padIndex of ends) {
      currentHolds.delete(padIndex)
    }

    for (const padIndex of starts) {
      currentHolds.add(padIndex)
    }
  }
  return rows
}

const isInEitherSet = <T>(a: Set<T>, b: Set<T>) => {
  return [...a].some(c => b.has(c)) || [...b].some(c => a.has(c))
}

const makeAllFootCombinations = (): FootStance[] => {
  const pads = [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const stances: FootStance[] = []

  for (const L of pads) {
    for (const R of pads) {
      if (L === R && L !== null) continue
      stances.push({ L: L !== null ? new Set([L]) : null, R: R !== null ? new Set([R]) : null })
      if (L !== null || R !== null) {
        if (([0, 1, 3, 4] as Array<number | null>).includes(L) && R !== 2) {
          stances.push({ L: new Set([2, L!]), R: R !== null ? new Set([R]) : null })
          if (([5, 6, 8, 9] as Array<number | null>).includes(R)) {
            stances.push({ L: new Set([2, L!]), R: new Set([7, R!]) })
          }
        }
        if (([0, 1, 3, 4] as Array<number | null>).includes(R) && L !== 2) {
          stances.push({ L: L !== null ? new Set([L]) : null, R: new Set([2, R!]) })
          if (([5, 6, 8, 9] as Array<number | null>).includes(L)) {
            stances.push({ L: new Set([7, L!]), R: new Set([2, R!]) })
          }
        }
        if (([5, 6, 8, 9] as Array<number | null>).includes(L) && R !== 7) {
          stances.push({ L: new Set([7, L!]), R: R !== null ? new Set([R]) : null })
        }
        if (([5, 6, 8, 9] as Array<number | null>).includes(R) && L !== 7) {
          stances.push({ L: L !== null ? new Set([L]) : null, R: new Set([7, R!]) })
        }
        if (L === 3 && R !== 6) {
          stances.push({ L: new Set([3, 6]), R: R !== null ? new Set([R]) : null })
          if (([0, 1, 3, 4] as Array<number | null>).includes(R)) {
            stances.push({ L: new Set([3, 6]), R: new Set([2, R!]) })
          }
          if (([5, 8, 9] as Array<number | null>).includes(R)) {
            stances.push({ L: new Set([3, 6]), R: new Set([7, R!]) })
          }
          if (R === 4) {
            stances.push({ L: new Set([3, 6]), R: new Set([4, 5]) })
          }
        }
        if (L === 4 && R !== 5) {
          stances.push({ L: new Set([4, 5]), R: R !== null ? new Set([R]) : null })
          if (([0, 1, 3, 4] as Array<number | null>).includes(R)) {
            stances.push({ L: new Set([4, 5]), R: new Set([2, R!]) })
          }
          if (([6, 8, 9] as Array<number | null>).includes(R)) {
            stances.push({ L: new Set([4, 5]), R: new Set([7, R!]) })
          }
          if (R === 3) {
            stances.push({ L: new Set([4, 5]), R: new Set([3, 6]) })
          }
        }
        if (R === 3 && L !== 6) {
          stances.push({ L: L !== null ? new Set([L]) : null, R: new Set([3, 6]) })
          if (([0, 1, 3, 4] as Array<number | null>).includes(L)) {
            stances.push({ L: new Set([2, L!]), R: new Set([3, 6]) })
          }
          if (([5, 8, 9] as Array<number | null>).includes(L)) {
            stances.push({ L: new Set([7, L!]), R: new Set([3, 6]) })
          }
          if (L === 4) {
            stances.push({ L: new Set([4, 5]), R: new Set([3, 6]) })
          }
        }
        if (R === 4 && L !== 5) {
          stances.push({ L: L !== null ? new Set([L]) : null, R: new Set([4, 5]) })
          if (([0, 1, 3, 4] as Array<number | null>).includes(L)) {
            stances.push({ L: new Set([2, L!]), R: new Set([4, 5]) })
          }
          if (([6, 8, 9] as Array<number | null>).includes(L)) {
            stances.push({ L: new Set([7, L!]), R: new Set([4, 5]) })
          }
          if (L === 3) {
            stances.push({ L: new Set([3, 6]), R: new Set([4, 5]) })
          }
        }
      }
    }
  }

  return stances
}

const isValidTransition = (
  previous: InternalState,
  next: FootStance,
  row: ChartRow
): boolean => {
  if ((isInEitherSet(previous.footStance.L ?? new Set<number>(), next.R ?? new Set<number>()) &&
  (next.L === null || isInEitherSet(next.L, next.R ?? new Set<number>()))) ||
  (isInEitherSet(previous.footStance.R ?? new Set<number>(), next.L ?? new Set<number>()) && (next.R === null || isInEitherSet(next.R, next.L ?? new Set<number>())))) {
    return false
  }

  if (![...row.required, ...row.holds].every(r => (next.L?.has(r) || next.R?.has(r)) ?? false)) {
    return false
  }

  if (new Set([...row.required, ...row.holds]).size < new Set([...(next.L ?? []), ...(next.R ?? [])]).size) {
    return false
  }

  for (const pad of row.holds) {
    const owner = previous.holdOwners.get(pad)

    if (owner === 'L' && !next.L?.has(pad)) return false
    if (owner === 'R' && !next.R?.has(pad)) return false
  }

  return true
}

const nextHoldOwners = (
  previous: InternalState,
  next: FootStance,
  row: ChartRow
): Map<number, Foot> => {
  const result = new Map(previous.holdOwners)

  for (const pad of row.ends) {
    result.delete(pad)
  }

  for (const pad of row.starts) {
    const owner = next.L?.has(pad) ? 'L' : next.R?.has(pad) ? 'R' : null

    if (owner === null) {
      throw new Error(`Long start on pad ${pad} is not covered`)
    }

    result.set(pad, owner)
  }

  return result
}

const footMovementCost = (from: PadIndex, to: PadIndex): number => {
  if (from === null || to === null || from === to) return 0

  const a = [...from].reduce((prev, curr) => ({ x: prev.x + padPositions[curr].x / from.size, y: prev.y + padPositions[curr].y / from.size }), { x: 0, y: 0 })
  const b = [...to].reduce((prev, curr) => ({ x: prev.x + padPositions[curr].x / from.size, y: prev.y + padPositions[curr].y / from.size }), { x: 0, y: 0 })

  const dx = a.x - b.x
  const dy = a.y - b.y

  return dx * dx + dy * dy
}

const calculateAngle = (previous: InternalState, next: FootStance): number => {
  const R = [...(next.R ?? previous.footStance.R ?? [])]
  const L = [...(next.L ?? previous.footStance.L ?? [])]
  const RPos = R.reduce((prev, curr) => ({ x: prev.x + padPositions[curr].x / R.length, y: prev.y + padPositions[curr].y / R.length }), { x: 0, y: 0 })
  const LPos = L.reduce((prev, curr) => ({ x: prev.x + padPositions[curr].x / L.length, y: prev.y + padPositions[curr].y / L.length }), { x: 0, y: 0 })

  const dx = RPos.x - LPos.x
  const dy = RPos.y - LPos.y

  return Math.atan2(dy, dx)
}

const transitionCost = (previous: InternalState, next: FootStance, time: number): number => {
  const angle = calculateAngle(previous, next)
  const costs: number[] = [
    ((previous.footStance.L === next.L)
      ? 0
      : Math.pow(footMovementCost(previous.footStance.L, next.L), 1) * (250 / (time - previous.footStance.Lt))),
    ((previous.footStance.R === next.R)
      ? 0
      : Math.pow(footMovementCost(previous.footStance.R, next.R), 1) * (250 / (time - previous.footStance.Rt))),
    (angle - previous.angle !== 0) ? Math.abs((angle - previous.angle) - (previous.angleDelta / 2)) * 2 * (250 / (time - previous.time)) : 0, // give more weight to changes in angle
    (angle >= Math.PI * 0.5 || angle <= -Math.PI * 0.5) ? (Math.abs(angle)) * ((time - previous.time) / 100) : 0, // but we still want to give some weight when the angle itself is too extreme
    (previous.L !== null && next.L !== null && previous.footStance.L !== next.L) ? (isInEitherSet(previous.footStance.L ?? new Set(), next.L) ? 0.3 : 3) * (500 / (time - previous.footStance.Lt)) : 0, // we prefer changing feet
    (previous.R !== null && next.R !== null && previous.footStance.R !== next.R) ? (isInEitherSet(previous.footStance.R ?? new Set(), next.R) ? 0.3 : 3) * (500 / (time - previous.footStance.Rt)) : 0, // we prefer changing feet
    ((next.L?.size ?? 0) > 1 && next.R === null) || ((next.R?.size ?? 0) > 1 && next.L === null) ? 5 : 0 // use bracket only when needed
  ]

  const movement = costs.reduce((sum, cost) => sum + cost, 0)

  return movement
}

const stateKey = (state: InternalState): string => {
  const holds = [...state.holdOwners.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pad, foot]) => `${pad}:${foot}`)
    .join(',')

  return [
    state.L,
    state.R,
    state.footStance.L,
    state.footStance.R,
    state.footStance.Lt,
    state.footStance.Rt,
    state.angle,
    state.angleDelta,
    holds
  ].join('|')
}

export const predictFeet = (chart: Chart): PredictionState[] => {
  const rows = buildChartRows(chart)
  const stances = makeAllFootCombinations()

  let currentStates: InternalState[] = [{
    time: 0,
    L: chart.type === 'single' ? new Set([0]) : new Set([4]),
    R: chart.type === 'single' ? new Set([4]) : new Set([5]),
    footStance: { L: chart.type === 'single' ? new Set([0]) : new Set([4]), R: chart.type === 'single' ? new Set([4]) : new Set([5]), Lt: 0, Rt: 0 },
    holdOwners: new Map(),
    totalCost: 0,
    prev: null,
    angle: 0,
    angleDelta: 0,
  }]

  for (const row of rows) {
    const bestNextStates = new Map<string, InternalState>()

    for (const previous of currentStates) {
      for (const stance of stances) {
        if (!isValidTransition(previous, stance, row)) continue

        const angle = calculateAngle(previous, stance)
        const next: InternalState = {
          time: row.time,
          L: stance.L,
          R: stance.R,
          footStance: {
            L: stance.L ?? previous.footStance.L,
            R: stance.R ?? previous.footStance.R,
            Lt: stance.L !== null ? row.time : previous.footStance.Lt,
            Rt: stance.R !== null ? row.time : previous.footStance.Rt
          },
          holdOwners: nextHoldOwners(previous, stance, row),
          totalCost: previous.totalCost + transitionCost(previous, stance, row.time),
          prev: previous,
          angle,
          angleDelta: angle - previous.angle
        }

        const key = stateKey(next)
        const existing = bestNextStates.get(key)

        if (existing === undefined || next.totalCost < existing.totalCost) {
          bestNextStates.set(key, next)
        }
      }
    }

    currentStates = [...bestNextStates.values()]

    if (currentStates.length === 0) {
      console.error(row)
      throw new Error(`No valid foot placement at ${row.time}ms`)
    }
  }

  const bestFinalState = currentStates.reduce((best, state) => {
    return state.totalCost < best.totalCost ? state : best
  })

  const result: PredictionState[] = []

  for (
    let state: InternalState | null = bestFinalState;
    state !== null && state.prev !== null;
    state = state.prev
  ) {
    // console.log(state)
    result.push({
      time: state.time,
      L: state.L === null ? [] : [...state.L],
      R: state.R === null ? [] : [...state.R]
    })
  }

  return result.reverse()
}
