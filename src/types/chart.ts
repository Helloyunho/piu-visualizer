export interface Chart {
  type: 'single' | 'double' | 'half-double'
  blocks: ChartBlock[]
}

export interface ChartBlock {
  bpm: number
  delay: number
  split: number
  startTime: number
  notes: Note[]
}

export interface Note {
  time: number
  padIndex: number
  type: typeof NOTE_TYPES[keyof typeof NOTE_TYPES]
}

export const NOTE_TYPES = {
  Normal: 0,
  LongStart: 1,
  LongMiddle: 2,
  LongEnd: 3
}

export const PAD_COUNT_MAP: Record<Chart['type'], number> = {
  single: 5,
  double: 10,
  'half-double': 6
}
