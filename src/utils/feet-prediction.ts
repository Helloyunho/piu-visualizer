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

type PadIndex = number | null

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

export const singlePadPositions = [
  { x: -1, y: -1 },
  { x: -1, y: 1 },
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 1, y: -1 }
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

const makeAllSingleFootCombinations = (): FootStance[] => {
  const pads = [null, 0, 1, 2, 3, 4]
  const stances: FootStance[] = []

  for (const L of pads) {
    for (const R of pads) {
      if (L === R && L !== null) continue
      stances.push({ L, R })
    }
  }

  return stances
}

const isValidTransition = (
  previous: InternalState,
  next: FootStance,
  row: ChartRow
): boolean => {
  if ((previous.footStance.L === next.R && (next.L === null || next.L === next.R)) || (previous.footStance.R === next.L && (next.R === null || next.R === next.L))) {
    return false
  }

  for (const pad of row.required) {
    if (next.L !== pad && next.R !== pad) return false
  }

  const activePadsThisRow = new Set([
    ...row.required,
    ...row.holds
  ])

  if (next.L !== null && !activePadsThisRow.has(next.L)) {
    return false
  }

  if (next.R !== null && !activePadsThisRow.has(next.R)) {
    return false
  }

  for (const pad of row.holds) {
    const owner = previous.holdOwners.get(pad)

    if (owner === 'L' && next.L !== pad) return false
    if (owner === 'R' && next.R !== pad) return false
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
    const owner = next.L === pad ? 'L' : next.R === pad ? 'R' : null

    if (owner === null) {
      throw new Error(`Long start on pad ${pad} is not covered`)
    }

    result.set(pad, owner)
  }

  return result
}

const footMovementCost = (from: PadIndex, to: PadIndex): number => {
  if (from === null || to === null || from === to) return 0

  const a = singlePadPositions[from]
  const b = singlePadPositions[to]

  const dx = a.x - b.x
  const dy = a.y - b.y

  return dx * dx + dy * dy
}

const transitionCost = (previous: InternalState, next: FootStance, time: number): number => {
  const dy = singlePadPositions[next.R ?? previous.footStance.R ?? 0].y - singlePadPositions[next.L ?? previous.footStance.L ?? 0].y
  const dx = singlePadPositions[next.R ?? previous.footStance.R ?? 0].x - singlePadPositions[next.L ?? previous.footStance.L ?? 0].x

  const angle = Math.atan2(dy, dx)
  const costs: number[] = [
    ((previous.footStance.L === next.L)
      ? 0
      : Math.pow(footMovementCost(previous.footStance.L, next.L), 1) * (500 / (time - previous.footStance.Lt))),
    ((previous.footStance.R === next.R)
      ? 0
      : Math.pow(footMovementCost(previous.footStance.R, next.R), 1) * (500 / (time - previous.footStance.Rt))),
    (angle - previous.angle !== 0 && previous.angleDelta !== angle - previous.angle) ? Math.abs((angle - previous.angle) - previous.angleDelta) * 2 * (250 / (time - previous.time)) : 0, // give more weight to changes in angle
    angle >= Math.PI * 3 / 4 || angle <= -Math.PI * 3 / 4 ? (Math.abs(angle) - Math.PI * 2 / 3) : 0, // but we still want to give some weight when the angle itself is too extreme
  ]

  const movement = costs.reduce((sum, cost) => sum + cost, 0)

  if ((time === 6100) || (time === 6350)) {
    console.log(`\nCost for stance L: ${next.L} R: ${next.R}`, `\nPrevious angle: ${previous.angle}, angleDelta: ${previous.angleDelta}`, `\nPrevious foot stance: L: ${previous.footStance.L}, R: ${previous.footStance.R}, Lt: ${previous.footStance.Lt}, Rt: ${previous.footStance.Rt}`, `\nCost for left foot: ${costs[0]}`, `\nCost for right foot: ${costs[1]}`, `\nCost for angle change: ${costs[2]}`, `\nCost for extreme angle: ${costs[3]}`, `\nTotal cost: ${movement}`, `\nSum of cost: ${previous.totalCost + movement}`)
  }

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
  if (chart.type !== 'single') {
    throw new Error('This first version only supports single charts')
  }

  const rows = buildChartRows(chart)
  const stances = makeAllSingleFootCombinations()

  let currentStates: InternalState[] = [{
    time: 0,
    L: 0,
    R: 4,
    footStance: { L: 0, R: 4, Lt: 0, Rt: 0 },
    holdOwners: new Map(),
    totalCost: 0,
    prev: null,
    angle: 0,
    angleDelta: 0
  }]

  for (const row of rows) {
    const bestNextStates = new Map<string, InternalState>()

    for (const previous of currentStates) {
      for (const stance of stances) {
        if (!isValidTransition(previous, stance, row)) continue

        const angle = Math.atan2(
          singlePadPositions[stance.R ?? previous.footStance.R ?? 0].y - singlePadPositions[stance.L ?? previous.footStance.L ?? 0].y,
          singlePadPositions[stance.R ?? previous.footStance.R ?? 0].x - singlePadPositions[stance.L ?? previous.footStance.L ?? 0].x
        )
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
      L: state.L === null ? [] : [state.L],
      R: state.R === null ? [] : [state.R]
    })
  }

  return result.reverse()
}
