"use client"

import { useEffect, useRef } from "react"

export function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Animation variables
    let animationId: number
    let time = 0

    // Create gradient
    const createGradient = () => {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "rgba(0, 150, 136, 0.1)") // Teal
      gradient.addColorStop(0.5, "rgba(128, 203, 196, 0.05)") // Light teal
      gradient.addColorStop(1, "rgba(224, 242, 241, 0.1)") // Very light teal
      return gradient
    }

    // Draw water ripples
    const drawRipples = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background gradient
      ctx.fillStyle = createGradient()
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw animated ripples
      for (let i = 0; i < 3; i++) {
        const x = (canvas.width / 4) * (i + 1)
        const y = canvas.height / 2
        const radius = 50 + Math.sin(time * 0.01 + i * 2) * 20

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 150, 136, ${0.1 - i * 0.02})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Floating particles
      for (let i = 0; i < 20; i++) {
        const x = Math.sin(time * 0.005 + i) * 100 + (canvas.width / 20) * i
        const y = Math.cos(time * 0.003 + i) * 50 + canvas.height / 2

        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(128, 203, 196, ${0.3 + Math.sin(time * 0.01 + i) * 0.2})`
        ctx.fill()
      }

      time += 1
      animationId = requestAnimationFrame(drawRipples)
    }

    drawRipples()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%)" }}
    />
  )
}
