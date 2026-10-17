import { type Chart, type ChartBlock, NOTE_TYPES } from '@/types/chart'
import { ByteReader } from '@/utils/byte-reader'

const parseNote = (note: [number, number, number]): typeof NOTE_TYPES[keyof typeof NOTE_TYPES] | null => {
  if ((note[0] === 0 && note[1] === 0 && note[2] === 0) || note[1] === 0 || ((note[0] >> 5) & 7) !== 2 || note[2] >> 14 !== 0) {
    return null
  }
  const long = (note[0] >> 2) & 3
  return long
}

export const parseNX20 = (fileContent: ArrayBuffer): Chart => {
  const reader = new ByteReader(fileContent)
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

  const magic = reader.readString(4)
  if (magic !== 'NX20') {
    throw new Error('Invalid NX20 file format, magic number does not match')
  }

  reader.readUint32() // startCol
  const numColumns = reader.readUint32()
  const direct = reader.readUint32()

  if (direct !== 0) {
    throw new Error('Direct files not supported')
  }
  if (numColumns === 10) {
    chart.type = 'double'
  } else if (numColumns === 6) {
    chart.type = 'half-double'
  } else if (numColumns === 5) {
    chart.type = 'single'
  } else {
    throw new Error(`Invalid number of columns: ${numColumns}`)
  }

  const metadataCount = reader.readUint32()
  for (let i = 0; i < metadataCount; i++) {
    reader.readUint32() // key
    reader.readUint32() // value
  }

  const numBlocks = reader.readUint32()
  for (let i = 0; i < numBlocks; i++) {
    reader.readUint32() // div_sel, dummy1~3
    const metadataCount = reader.readUint32()
    for (let j = 0; j < metadataCount; j++) {
      reader.readUint32() // key
      reader.readUint32() // value
    }

    const divCount = reader.readUint32()
    for (let j = 0; j < divCount; j++) {
      const msStart = reader.readFloat32()
      const bpm = reader.readFloat32()
      reader.readFloat32() // beatPerLine
      const delay = reader.readFloat32()
      reader.readFloat32() // speed
      const beatSplit = reader.readUint8()
      reader.readUint8() // beatMeasure
      reader.readUint8() // bmFlags
      reader.readUint8() // reserved
      const divParamCount = reader.readUint32()
      for (let k = 0; k < divParamCount; k++) {
        reader.readUint32() // key
        reader.readUint32() // value
      }

      block.bpm = bpm
      block.delay = delay
      block.split = beatSplit
      block.startTime = msStart

      const numRows = reader.readUint32()
      let currentTime = msStart
      const msPerBeat = 60000 / bpm
      const msPerRow = msPerBeat / beatSplit

      for (let r = 0; r < numRows; r++) {
        const first = reader.readUint8()
        const second = reader.readUint8()
        const third = reader.readUint16()
        if (first === 0x80) {
          currentTime += msPerRow
          continue
        }
        const noteType = parseNote([first, second, third])
        if (noteType !== null) {
          block.notes.push({
            time: currentTime,
            padIndex: 0,
            type: noteType
          })
        }
        for (let c = 1; c < numColumns; c++) {
          const first = reader.readUint8()
          const second = reader.readUint8()
          const third = reader.readUint16()
          const noteType = parseNote([first, second, third])
          if (noteType !== null) {
            block.notes.push({
              time: currentTime,
              padIndex: c,
              type: noteType
            })
          }
        }
        currentTime += msPerRow
      }
      chart.blocks.push({ ...block })
      block.notes = []
    }
  }

  return chart
}
