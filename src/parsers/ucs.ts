import { type Chart, type ChartBlock, type Note, NOTE_TYPES } from '@/types/chart'

export const parseUCS = (fileContent: string): Chart => {
  const lines = fileContent.split(/\r?\n/)

  if (lines.length === 0 || lines[0].trim() !== ':Format=1') {
    throw new Error('Invalid UCS file format, Format has to be 1')
  }

  const chart: Chart = {
    type: 'single',
    blocks: []
  }

  const block: ChartBlock = {
    bpm: 120,
    delay: 0,
    split: 4,
    startTime: 0,
    notes: []
  }

  let processingNotes = false
  let currentTime = 0

  for (const line of lines.slice(1)) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    if (trimmedLine.startsWith(':')) {
      if (processingNotes) {
        // Finish the current block and start a new one
        chart.blocks.push({ ...block })
        block.notes = []
        block.startTime = currentTime
        processingNotes = false
      }
      if (trimmedLine.startsWith(':Mode=')) {
        const mode = trimmedLine.substring(6)
        if (mode === 'Double') {
          chart.type = 'double'
        } else if (mode === 'Half-Double') {
          chart.type = 'half-double'
        } else if (mode === 'Single') {
          chart.type = 'single'
        } else {
          throw new Error(`Invalid mode: ${mode}`)
        }
      } else if (trimmedLine.startsWith(':BPM=')) {
        const bpm = parseFloat(trimmedLine.substring(5))
        if (isNaN(bpm) || bpm <= 0) {
          throw new Error(`Invalid BPM value: ${trimmedLine.substring(5)}`)
        }
        block.bpm = bpm
      } else if (trimmedLine.startsWith(':Delay=')) {
        const delay = parseFloat(trimmedLine.substring(7))
        if (isNaN(delay) || delay < 0) {
          throw new Error(`Invalid Delay value: ${trimmedLine.substring(7)}`)
        }
        block.delay = delay
        currentTime += delay
        block.startTime = currentTime
      } else if (trimmedLine.startsWith(':Split=')) {
        const split = parseInt(trimmedLine.substring(7))
        if (isNaN(split) || split <= 0) {
          throw new Error(`Invalid Split value: ${trimmedLine.substring(7)}`)
        }
        block.split = split
      }
    } else {
      processingNotes = true
      block.notes.push(...trimmedLine.split('').reduce((acc, char, index) => {
        const noteType = char.toUpperCase()
        if (noteType === '.') return acc
        acc.push({
          time: currentTime,
          padIndex: index,
          type: noteType === 'X'
            ? NOTE_TYPES.Normal
            : noteType === 'M'
              ? NOTE_TYPES.LongStart
              : noteType === 'H'
                ? NOTE_TYPES.LongMiddle
                : noteType === 'W'
                  ? NOTE_TYPES.LongEnd
                  : (() => { throw new Error(`Invalid note type: ${char}`) })()
        })
        return acc
      }, [] as Note[]))

      const msPerBeat = 60000 / block.bpm
      const msPerRow = msPerBeat / block.split
      currentTime += msPerRow
    }
  }

  if (processingNotes) {
    chart.blocks.push({ ...block })
  }
  return chart
}
