export class ByteReader {
  view: DataView
  offset: number

  constructor (buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
    this.offset = 0
  }

  readUint8 (): number {
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  readUint16 (littleEndian = true): number {
    const value = this.view.getUint16(this.offset, littleEndian)
    this.offset += 2
    return value
  }

  readUint32 (littleEndian = true): number {
    const value = this.view.getUint32(this.offset, littleEndian)
    this.offset += 4
    return value
  }

  readFloat32 (littleEndian = true): number {
    const value = this.view.getFloat32(this.offset, littleEndian)
    this.offset += 4
    return value
  }

  readBytes (length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length)
    this.offset += length
    return bytes
  }

  readString (length: number): string {
    const bytes = this.readBytes(length)
    return new TextDecoder().decode(bytes)
  }
}
