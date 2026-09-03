export class AnimationManager {
  callbacks: Set<(time?: number) => void>
  rafId: number | null = null

  constructor () {
    this.callbacks = new Set()
  }

  addCallback (callback: (time?: number) => void) {
    this.callbacks.add(callback)
    if (this.rafId === null) {
      this.start()
    }
  }

  removeCallback (callback: (time?: number) => void) {
    this.callbacks.delete(callback)
    if (this.callbacks.size === 0 && this.rafId !== null) {
      this.stop()
    }
  }

  clearCallbacks () {
    this.callbacks.clear()
    if (this.rafId !== null) {
      this.stop()
    }
  }

  private start () {
    const loop = (time: number) => {
      this.callbacks.forEach(callback => callback(time))
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  private stop () {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
