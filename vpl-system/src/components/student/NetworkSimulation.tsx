"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { RotateCcw, Network } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NetworkNode {
  id: string
  label: string
  x: number
  y: number
}

export interface NetworkLink {
  source: string
  target: string
  cost: number
}

export interface NetworkTopology {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

interface Packet {
  id: number
  source: string
  target: string
  path: string[]
  progress: number
  currentEdge: number
  color: string
  label: string
  size: number
}

interface NetworkSimulationProps {
  topology: NetworkTopology | null
  onTopologyChange: (topology: NetworkTopology | null) => void
  isRunning: boolean
  onRunCode: (code: string) => void
}

const DEFAULT_TOPOLOGY: NetworkTopology = {
  nodes: [
    { id: "A", label: "A", x: 100, y: 100 },
    { id: "B", label: "B", x: 300, y: 60 },
    { id: "C", label: "C", x: 100, y: 280 },
    { id: "D", label: "D", x: 500, y: 60 },
    { id: "E", label: "E", x: 500, y: 280 },
    { id: "F", label: "F", x: 300, y: 340 },
  ],
  links: [
    { source: "A", target: "B", cost: 10 },
    { source: "A", target: "C", cost: 8 },
    { source: "B", target: "D", cost: 5 },
    { source: "B", target: "E", cost: 12 },
    { source: "C", target: "E", cost: 7 },
    { source: "C", target: "F", cost: 15 },
    { source: "D", target: "E", cost: 3 },
    { source: "E", target: "F", cost: 6 },
  ],
}

const PACKET_COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f78166", "#bc8cff", "#ff7b72"]

export default function NetworkSimulation({
  topology,
  onTopologyChange,
  isRunning,
  onRunCode,
}: NetworkSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const [simTopology, setSimTopology] = useState<NetworkTopology>(topology || DEFAULT_TOPOLOGY)
  const [packets, setPackets] = useState<Packet[]>([])
  const [activeTab, setActiveTab] = useState<"visualize" | "routes">("visualize")
  const [nextPacketId, setNextPacketId] = useState(1)
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [destFilter, setDestFilter] = useState<string>("")
  const [simulationLog, setSimulationLog] = useState<string[]>([])

  // Sync topology from parent
  useEffect(() => {
    if (topology) {
      setSimTopology(topology)
    }
  }, [topology])

  function addLog(msg: string) {
    setSimulationLog((prev) => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  function sendPacket(source: string, target: string) {
    if (!simTopology) return
    if (source === target) return

    // Simple BFS pathfinding
    const adj = new Map<string, { node: string; cost: number }[]>()
    for (const node of simTopology.nodes) {
      adj.set(node.id, [])
    }
    for (const link of simTopology.links) {
      adj.get(link.source)!.push({ node: link.target, cost: link.cost })
      adj.get(link.target)!.push({ node: link.source, cost: link.cost })
    }

    // BFS to find shortest path
    const queue: { node: string; path: string[] }[] = [{ node: source, path: [source] }]
    const visited = new Set<string>([source])
    let foundPath: string[] | null = null

    while (queue.length > 0) {
      const { node, path } = queue.shift()!
      if (node === target) {
        foundPath = path
        break
      }
      for (const neighbor of adj.get(node) || []) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node)
          queue.push({ node: neighbor.node, path: [...path, neighbor.node] })
        }
      }
    }

    if (foundPath) {
      const color = PACKET_COLORS[nextPacketId % PACKET_COLORS.length]
      const newPacket: Packet = {
        id: nextPacketId,
        source,
        target,
        path: foundPath,
        progress: 0,
        currentEdge: 0,
        color,
        label: `Packet #${nextPacketId}`,
        size: 6,
      }
      setPackets((prev) => [...prev, newPacket])
      setNextPacketId((prev) => prev + 1)
      addLog(`Packet #${nextPacketId}: ${source} → ${target} (path: ${foundPath.join(" → ")})`)
    } else {
      addLog(`No route from ${source} to ${target}`)
    }
  }

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !simTopology) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height

    // Clear
    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = "#0d1117"
    ctx.fillRect(0, 0, w, h)

    // Edge gradient
    ctx.strokeStyle = "#30363d"
    ctx.lineWidth = 2

    // Draw links
    for (const link of simTopology.links) {
      const sourceNode = simTopology.nodes.find((n) => n.id === link.source)
      const targetNode = simTopology.nodes.find((n) => n.id === link.target)
      if (!sourceNode || !targetNode) continue

      ctx.beginPath()
      ctx.moveTo(sourceNode.x, sourceNode.y)
      ctx.lineTo(targetNode.x, targetNode.y)
      ctx.stroke()

      // Draw cost label
      const mx = (sourceNode.x + targetNode.x) / 2
      const my = (sourceNode.y + targetNode.y) / 2
      ctx.fillStyle = "#8b949e"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(`${link.cost}ms`, mx, my - 4)
    }

    // Draw packets (animated)
    for (const packet of packets) {
      if (packet.currentEdge >= packet.path.length - 1) continue

      const fromId = packet.path[packet.currentEdge]
      const toId = packet.path[packet.currentEdge + 1]
      const fromNode = simTopology.nodes.find((n) => n.id === fromId)
      const toNode = simTopology.nodes.find((n) => n.id === toId)
      if (!fromNode || !toNode) continue

      // Update progress
      packet.progress += 0.008
      if (packet.progress >= 1) {
        packet.progress = 0
        packet.currentEdge++
        if (packet.currentEdge >= packet.path.length - 1) {
          addLog(`${packet.label}: arrived at ${toId}`)
          continue
        }
      }

      const t = packet.progress
      const x = fromNode.x + (toNode.x - fromNode.x) * t
      const y = fromNode.y + (toNode.y - fromNode.y) * t

      // Draw glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, packet.size * 2.5)
      gradient.addColorStop(0, packet.color + "80")
      gradient.addColorStop(1, packet.color + "00")
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, packet.size * 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Draw packet
      ctx.fillStyle = packet.color
      ctx.beginPath()
      ctx.arc(x, y, packet.size, 0, Math.PI * 2)
      ctx.fill()

      // Draw trail
      ctx.strokeStyle = packet.color + "40"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    // Draw nodes (on top)
    for (const node of simTopology.nodes) {
      // Node shadow
      ctx.fillStyle = "#161b22"
      ctx.beginPath()
      ctx.arc(node.x + 1, node.y + 1, 22, 0, Math.PI * 2)
      ctx.fill()

      // Node circle
      const isActive = packets.some(
        (p) =>
          p.currentEdge < p.path.length - 1 &&
          (p.path[p.currentEdge] === node.id || p.path[p.currentEdge + 1] === node.id)
      )
      ctx.fillStyle = isActive ? "#1c2a3a" : "#161b22"
      ctx.strokeStyle = isActive ? "#58a6ff" : "#30363d"
      ctx.lineWidth = isActive ? 2.5 : 1.5
      ctx.beginPath()
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Node label
      ctx.fillStyle = "#c9d1d9"
      ctx.font = "bold 13px monospace"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(node.label, node.x, node.y)
    }

    animRef.current = requestAnimationFrame(animate)
  }, [packets, simTopology])

  // Start animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [animate])

  // Clean up arrived packets
  useEffect(() => {
    const interval = setInterval(() => {
      setPackets((prev) => prev.filter((p) => p.currentEdge < p.path.length - 1))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  function handleReset() {
    setPackets([])
    setNextPacketId(1)
    setSimulationLog([])
    addLog("Network simulation reset")
  }

  function handleAutoTraffic() {
    if (!simTopology || simTopology.nodes.length < 2) return

    // Send packets between random nodes every second
    let count = 0
    const maxPackets = 10
    const interval = setInterval(() => {
      const nodes = simTopology!.nodes
      const src = nodes[Math.floor(Math.random() * nodes.length)].id
      let dst: string
      do {
        dst = nodes[Math.floor(Math.random() * nodes.length)].id
      } while (dst === src)

      sendPacket(src, dst)
      count++
      if (count >= maxPackets) {
        clearInterval(interval)
        addLog("Auto traffic complete")
      }
    }, 800)

    addLog("Starting auto traffic simulation...")
  }

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#30363d] bg-[#161b22] px-3">
        <Network className="size-4 text-[#58a6ff]" />
        <span className="text-xs font-medium text-[#c9d1d9]">Network Lab</span>
        <div className="ml-auto flex items-center gap-1.5">
          {/* Source/Dest selectors */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#8b949e]">From:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-6 rounded border border-[#30363d] bg-[#0d1117] px-1.5 text-[10px] text-[#c9d1d9] outline-none"
            >
              <option value="">Select...</option>
              {simTopology?.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#8b949e]">To:</span>
            <select
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
              className="h-6 rounded border border-[#30363d] bg-[#0d1117] px-1.5 text-[10px] text-[#c9d1d9] outline-none"
            >
              <option value="">Select...</option>
              {simTopology?.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (sourceFilter && destFilter) sendPacket(sourceFilter, destFilter)
            }}
            disabled={!sourceFilter || !destFilter}
            className="flex h-6 items-center gap-1 rounded bg-[#58a6ff] px-2 text-[10px] font-medium text-white hover:bg-[#58a6ff]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Send packet"
          >
            Send
          </button>
          <div className="h-4 w-px bg-[#30363d]" />
          <button
            onClick={handleAutoTraffic}
            className="flex h-6 items-center gap-1 rounded bg-[#3fb950] px-2 text-[10px] font-medium text-white hover:bg-[#3fb950]/80 transition-colors"
            title="Auto traffic"
          >
            Auto Traffic
          </button>
          <button
            onClick={handleReset}
            className="flex h-6 items-center gap-1 rounded border border-[#30363d] px-2 text-[10px] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
            title="Reset"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex h-8 shrink-0 items-center border-b border-[#30363d] bg-[#161b22] px-3">
        <button
          onClick={() => setActiveTab("visualize")}
          className={cn(
            "flex h-full items-center border-b-2 px-3 text-[10px] font-medium transition-colors",
            activeTab === "visualize"
              ? "border-[#58a6ff] text-[#c9d1d9]"
              : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
          )}
        >
          Network Topology
        </button>
        <button
          onClick={() => setActiveTab("routes")}
          className={cn(
            "flex h-full items-center border-b-2 px-3 text-[10px] font-medium transition-colors",
            activeTab === "routes"
              ? "border-[#58a6ff] text-[#c9d1d9]"
              : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
          )}
        >
          Simulation Log
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "visualize" ? (
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ display: "block" }}
          />
        ) : (
          <div className="h-full overflow-y-auto p-3 font-mono text-xs leading-relaxed">
            {simulationLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#8b949e]">
                <Network className="size-8 mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
                <p className="text-[10px] mt-1">Send a packet or run auto traffic to see logs</p>
              </div>
            ) : (
              simulationLog.map((log, i) => (
                <div key={i} className="py-0.5 text-[#c9d1d9]">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
