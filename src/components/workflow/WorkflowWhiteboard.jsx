import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from 'react-tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { WORKFLOW_NODE_CATALOG } from '../../lib/workflow-catalog'
import useAppStore from '../../store/useAppStore'

const defaultTemplate = {
  name: 'Viral shorts workflow',
  description: 'Analyze the video, find moments, refine clips, render, and export.',
  nodes: [],
  edges: [],
  settings: {
    shortCount: 5,
    shortDuration: 30,
    language: 'en',
    aspectRatio: '9:16',
  },
}

const catalogMap = new Map(WORKFLOW_NODE_CATALOG.map((item) => [item.type, item]))

const edgeConditionDefaults = {
  mode: 'always',
  field: '',
  operator: 'equals',
  value: '',
  label: '',
}

const makeNodeDefaults = (type, position, index = 0) => {
  const catalog = catalogMap.get(type)
  return {
    id: crypto.randomUUID(),
    type,
    label: catalog?.label ?? type,
    position: position ?? { x: 0, y: 0 }, // Ensure position is always an object
    inputLabel: 'Input',
    outputLabel: 'Output',
    branchKey: '',
    order: index,
    config: {
      threshold: 0.65,
      duration: 30,
      focusMode: 'auto',
      captionStyle: 'clean',
      titleStyle: 'short',
      language: 'en',
      note: '',
    },
  }
}

const getNodeFill = (active, selected) => {
  if (selected) {
    return 'border-sky-500 bg-sky-50 shadow-lg'
  }

  if (active) {
    return 'border-orange-500 bg-orange-50 shadow-[0_12px_35px_rgba(249,115,22,0.12)]'
  }

  return 'border-slate-200 bg-white'
}

const buildPosition = (index, offset = { x: 0, y: 0 }) => ({
  x: 80 + (index % 3) * 280 + offset.x,
  y: 80 + Math.floor(index / 3) * 180 + offset.y,
})

export default function WorkflowWhiteboard({
  project,
  workflows,
  workflowRuns,
  onCreate,
  onUpdate,
  onDelete,
  onRun,
  initialSelectedWorkflowId,
  viewMode = 'default', // 'default' or 'focused'
}) {
  const boardRef = useRef(null)
  const dragStateRef = useRef(null)
  const initializedRef = useRef(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [draft, setDraft] = useState(defaultTemplate)
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set())
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [pendingSourceNodeId, setPendingSourceNodeId] = useState(null)
  const [drawingWire, setDrawingWire] = useState(null)
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [activeTool, setActiveTool] = useState('move') // 'select', 'pan', 'move'
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
  })

  const lastSelectedNodeId = useMemo(() => (
    selectedNodeIds.size === 1 ? selectedNodeIds.values().next().value : null), [selectedNodeIds])

  const workflowRuntime = useAppStore((state) => state.workflowRuntime)
  
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow._id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows],
  )

  useEffect(() => {
    if (selectedWorkflowId) { // Only update draft if a workflow is selected
      if (!selectedWorkflow) return
      setDraft({
        name: selectedWorkflow?.name ?? 'New Workflow',
        description: selectedWorkflow?.description ?? '',
        nodes: (selectedWorkflow.nodes ?? []).map((node, index) => ({
          ...node,
          order: node.order ?? index,
          inputLabel: node.inputLabel ?? 'Input',
          outputLabel: node.outputLabel ?? 'Output',
          branchKey: node.branchKey ?? '',
          position: node.position ?? { x: 0, y: 0 }, // Ensure position exists
          config: {
            threshold: 0.65,
            duration: 30,
            focusMode: 'auto',
            captionStyle: 'clean',
            titleStyle: 'short',
            language: 'en',
            note: '',
            ...(node.config ?? {}),
          },
        })),
        edges: selectedWorkflow.edges ?? [],
        settings: {
          ...defaultTemplate.settings,
          ...(selectedWorkflow.settings ?? {}),
        },
      })
    } else if (!initializedRef.current && initialSelectedWorkflowId) {
      initializedRef.current = true
      setSelectedWorkflowId(initialSelectedWorkflowId)
    }


  }, [selectedWorkflow, selectedWorkflowId, workflows, initialSelectedWorkflowId])

  const nodes = draft.nodes ?? []
  const edges = draft.edges ?? []

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const nodeStateById = workflowRuntime?.nodeStates ?? {}
  const activeNodeId = workflowRuntime?.activeNodeId ?? null

  const updateNode = (nodeId, patch) => {
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }))
  }

  const updateNodeConfig = (nodeId, configPatch) => {
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (
        node.id === nodeId
          ? {
              ...node,
              config: {
                ...(node.config ?? {}),
                ...configPatch,
              },
            }
          : node
      )),
    }))
  }

  const addNode = (type, position = null) => {
    const index = nodes.length
    setDraft((current) => ({
      ...current,
      nodes: [
        ...current.nodes,
        makeNodeDefaults(type, position ?? buildPosition(index), index),
      ],
    }))
  }

  const duplicateNode = (nodeId) => {
    const sourceNode = nodeById.get(nodeId)
    if (!sourceNode) return

    const newPosition = {
      x: sourceNode.position.x + 40,
      y: sourceNode.position.y + 40,
    }

    const newNode = makeNodeDefaults(sourceNode.type, newPosition, nodes.length)

    setDraft((current) => ({ ...current, nodes: [...current.nodes, newNode] }))
  }

  const addNodeFromDrop = (type, clientX, clientY) => {
    const board = boardRef.current
    if (!board) return

    const rect = board.getBoundingClientRect()
    addNode(type, {
      x: Math.max(24, (clientX - rect.left) / viewTransform.scale - viewTransform.x - 140),
      y: Math.max(24, (clientY - rect.top) / viewTransform.scale - viewTransform.y - 48),
    })
  }

  const createEdge = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return
    }

    setDraft((current) => {
      const existing = current.edges.some((edge) => edge.source === sourceId && edge.target === targetId)
      if (existing) {
        return current
      }

      return {
        ...current,
        edges: [
          ...current.edges,
          {
            id: crypto.randomUUID(),
            source: sourceId,
            target: targetId,
            label: 'True',
            condition: { ...edgeConditionDefaults },
          },
        ],
      }
    })
  }

  const removeNode = useCallback((nodeId) => {
    setDraft((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: current.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    }))
    setSelectedNodeIds((ids) => { const newIds = new Set(ids); newIds.delete(nodeId); return newIds; })
    setSelectedEdgeId(null)
  }, [])

  const moveNode = (nodeId, direction) => {
    setDraft((current) => {
      const nextNodes = [...current.nodes]
      const index = nextNodes.findIndex((node) => node.id === nodeId)
      const swapWith = index + direction
      if (index < 0 || swapWith < 0 || swapWith >= nextNodes.length) {
        return current
      }

      const temp = nextNodes[index]
      nextNodes[index] = nextNodes[swapWith]
      nextNodes[swapWith] = temp
      return {
        ...current,
        nodes: nextNodes.map((node, nodeIndex) => ({ ...node, order: nodeIndex })),
      }
    })
  }

  const removeEdge = useCallback((edgeId) => {
    setDraft((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== edgeId),
    }))
    setSelectedEdgeId(null)
  }, [])

  const updateEdge = (edgeId, patch) => {
    setDraft((current) => ({
      ...current,
      edges: current.edges.map((edge) => (
        edge.id === edgeId
          ? {
              ...edge,
              ...patch,
              condition: {
                ...edgeConditionDefaults,
                ...(edge.condition ?? {}),
                ...(patch.condition ?? {}),
              },
            }
          : edge
      )),
    }))
  }

  const saveWorkflow = useCallback(async () => {
     if (isSaving) return

    setIsSaving(true)
    setJustSaved(false)

    const payload = {
      name: draft.name || 'Untitled workflow',
      description: draft.description || '',
      nodes: nodes.map((node, index) => ({ ...node, order: index })),
      edges,
      settings: draft.settings,
    }

    try {
      if (selectedWorkflow) {
        const updated = await onUpdate(selectedWorkflow._id, payload)
        setSelectedWorkflowId(updated?._id ?? selectedWorkflow._id)
        return updated
      }
      const created = await onCreate(payload)
      setSelectedWorkflowId(created?._id ?? null)
      return created
    } finally {
      setIsSaving(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }, [isSaving, draft, nodes, edges, selectedWorkflow, onCreate, onUpdate, setSelectedWorkflowId])

  const runWorkflow = async () => {
    const workflow = selectedWorkflow ?? (await saveWorkflow())
    if (!workflow?._id) return null
    return onRun(workflow._id, {
      settings: draft.settings,
    })
  }

  const selectedNode = lastSelectedNodeId ? nodeById.get(lastSelectedNodeId) : null
  const selectedEdge = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) : null

  const startDrag = (nodeId, event) => {
    const node = nodeById.get(nodeId)
    if (!node) return

    event.preventDefault()
    event.stopPropagation()

    const dragOffsets = new Map()
    selectedNodeIds.forEach(id => {
      const n = nodeById.get(id)
      if (n) {
        dragOffsets.set(id, { x: n.position.x, y: n.position.y })
      }
    })

    dragStateRef.current = {
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.position.x,
      originY: node.position.y,
      dragOffsets,
    }
  }

  const startWireDrag = useCallback((sourceNodeId, event) => {
    event.preventDefault()
    event.stopPropagation()

    const board = boardRef.current
    if (!board) return

    // const rect = board.getBoundingClientRect()
    const src = nodeById.get(sourceNodeId)
    if (!src) return
    const rect = board.getBoundingClientRect()
    const startX = src.position.x + 240 // Output port X offset
    const startY = src.position.y + 90 // Output port Y offset

    const getPointFromEvent = (e) => ({
      x: (e.clientX - rect.left - viewTransform.x) / viewTransform.scale,
      y: (e.clientY - rect.top - viewTransform.y) / viewTransform.scale,
    })

    setDrawingWire({ sourceNodeId, startX, startY, ...getPointFromEvent(event) })

    const onMove = (moveEvent) => {
      setDrawingWire(d => ({ ...d, ...getPointFromEvent(moveEvent) }))
      // console.log('drawingWire updated:', ({ ...drawingWire, ...getPointFromEvent(moveEvent) })) // Debugging log
    }

    const onUp = (upEvent) => {
      const targetEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('[data-port="input"]')

      if (targetEl && targetEl.dataset.nodeid) {
        createEdge(sourceNodeId, targetEl.dataset.nodeid)
      }

      setDrawingWire(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [nodeById, viewTransform, createEdge])

  const handleNodePointerMove = (nodeId, event) => {
    if (event.buttons === 1 && !dragStateRef.current) {
      startDrag(nodeId, event)
    }
  }

  const handleNodeContextMenu = (event, nodeId) => {
    event.preventDefault()
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId,
    })
  }

  const closeContextMenu = () => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null })
    }
  }

  useEffect(() => {
    const onMove = (event) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      const dx = (event.clientX - dragState.startX) / viewTransform.scale
      const dy = (event.clientY - dragState.startY) / viewTransform.scale

      setDraft(current => ({
        ...current,
        nodes: current.nodes.map(node => {
          if (selectedNodeIds.has(node.id)) {
            const origin = dragState.dragOffsets.get(node.id) || node.position
            return {
              ...node,
              position: {
                x: Math.max(20, origin.x + dx),
                y: Math.max(20, origin.y + dy),
              }
            }
          }
          return node
        })
      }))
    }

    const onUp = () => {
      dragStateRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [nodeById, viewTransform, selectedNodeIds])

  const paletteDragStart = (event, type) => {
    event.dataTransfer.setData('application/x-viralforge-node', type)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleCanvasDrop = (event) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/x-viralforge-node')
    if (type) {
      addNodeFromDrop(type, event.clientX, event.clientY)
    }
  }

  const handleWheel = useCallback((event) => {
    // Only prevent default if the event is on the board itself,
    // allowing scroll inside side panels.
    if (event.target === boardRef.current) {
      event.preventDefault()
    }
    const { clientX, clientY, deltaY } = event
    const board = boardRef.current
    if (!board) return

    const rect = board.getBoundingClientRect()
    const scaleAmount = -deltaY * 0.001
    const newScale = Math.max(0.2, Math.min(2, viewTransform.scale + scaleAmount))

    const mouseX = clientX - rect.left
    const mouseY = clientY - rect.top

    const newX = viewTransform.x - (mouseX - viewTransform.x) * (newScale / viewTransform.scale - 1)
    const newY = viewTransform.y - (mouseY - viewTransform.y) * (newScale / viewTransform.scale - 1)

    setViewTransform({ x: newX, y: newY, scale: newScale })
  }, [viewTransform, setViewTransform])

  const handlePointerDown = useCallback((event) => {
    if (event.target !== boardRef.current) return;

    if (activeTool !== 'pan') {
      setSelectedNodeIds(new Set());
      setSelectedEdgeId(null);
    }

    closeContextMenu()

    if (event.shiftKey || activeTool === 'select') {
      const rect = boardRef.current.getBoundingClientRect()
      const startX = (event.clientX - rect.left - viewTransform.x) / viewTransform.scale
      const startY = (event.clientY - rect.top - viewTransform.y) / viewTransform.scale
      setSelectionBox({ startX, startY, endX: startX, endY: startY })
    } else if (activeTool === 'pan' || activeTool === 'move') {
      setIsPanning(true)
      dragStateRef.current = {
        startX: event.clientX - viewTransform.x,
        startY: event.clientY - viewTransform.y,
      }
    }
  }, [viewTransform, setSelectionBox, setIsPanning, startDrag, setSelectedNodeIds, setSelectedEdgeId, activeTool])

  const handlePointerMove = useCallback((event) => {
    if (selectionBox) {
      const rect = boardRef.current.getBoundingClientRect()
      const endX = (event.clientX - rect.left - viewTransform.x) / viewTransform.scale
      const endY = (event.clientY - rect.top - viewTransform.y) / viewTransform.scale
      setSelectionBox(b => ({ ...b, endX, endY }))
    } else if (isPanning && dragStateRef.current && (activeTool === 'pan' || activeTool === 'move')) {
      setViewTransform(v => ({
        ...v,
        x: event.clientX - dragStateRef.current.startX,
        y: event.clientY - dragStateRef.current.startY,
      }))
    }
  }, [selectionBox, setSelectionBox, isPanning, viewTransform, setViewTransform])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
    if (selectionBox) {
      const { startX, startY, endX, endY } = selectionBox
      const minX = Math.min(startX, endX)
      const maxX = Math.max(startX, endX)
      const minY = Math.min(startY, endY)
      const maxY = Math.max(startY, endY)

      const selected = new Set(nodes.filter(n =>
        n.position.x + 240 > minX && n.position.x < maxX && n.position.y + 120 > minY && n.position.y < maxY
      ).map(n => n.id))
      setSelectedNodeIds(selected)
      setSelectionBox(null)
    }
  }, [selectionBox, nodes, setSelectedNodeIds, setSelectionBox, setIsPanning])

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Save: Cmd/Ctrl + S
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        saveWorkflow()
      }

      // Tool shortcuts
      if (event.key.toLowerCase() === 'v') setActiveTool('select')
      if (event.key.toLowerCase() === 'h') setActiveTool('pan')
      if (event.key.toLowerCase() === 'm') setActiveTool('move')



      // Delete: Backspace or Delete
      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedNodeIds.size > 0) {
          selectedNodeIds.forEach(id => removeNode(id))
        }
        if (selectedEdgeId) {
          removeEdge(selectedEdgeId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeIds, selectedEdgeId, saveWorkflow, removeNode, removeEdge]) // Dependencies for keyboard shortcuts

  // Attach native event listeners for pan/zoom to ensure passive: false
  useEffect(() => {
    const boardElement = boardRef.current
    if (!boardElement) return

    // Use native event listeners to control passive behavior for wheel and pointer events
    // This prevents the "Unable to preventDefault inside passive event listener invocation" error
    boardElement.addEventListener('wheel', handleWheel, { passive: false })
    boardElement.addEventListener('pointerdown', handlePointerDown, { passive: false })
    boardElement.addEventListener('pointermove', handlePointerMove, { passive: false })
    boardElement.addEventListener('pointerup', handlePointerUp, { passive: false })

    return () => {
      boardElement.removeEventListener('wheel', handleWheel)
      boardElement.removeEventListener('pointerdown', handlePointerDown)
      boardElement.removeEventListener('pointermove', handlePointerMove)
      boardElement.removeEventListener('pointerup', handlePointerUp)
    }
  }, [boardRef, handleWheel, handlePointerDown, handlePointerMove, handlePointerUp]) // Dependencies for native event listeners

  const activeNodeCount = nodes.filter((node) => nodeStateById[node.id]?.status === 'running' || node.id === activeNodeId).length

  const isFocusedView = viewMode === 'focused'

  return (
    <div className={`grid h-full flex-1 gap-4 ${isFocusedView ? (selectedNode || selectedEdge ? 'grid-cols-1 xl:grid-cols-[1fr_340px]' : 'grid-cols-1') : 'lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_340px]'} relative`}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg">
        <button
          onClick={() => setActiveTool('move')}
          className={`h-9 w-9 rounded-full flex items-center justify-center transition ${activeTool === 'move' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          data-tooltip-id="toolbar-tooltip" data-tooltip-content="Move (M)"
        >
          M
        </button>
        <button
          onClick={() => setActiveTool('select')}
          className={`h-9 w-9 rounded-full flex items-center justify-center transition ${activeTool === 'select' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          data-tooltip-id="toolbar-tooltip" data-tooltip-content="Select (V)"
        >
          V
        </button>
        <button
          onClick={() => setActiveTool('pan')}
          className={`h-9 w-9 rounded-full flex items-center justify-center transition ${activeTool === 'pan' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          data-tooltip-id="toolbar-tooltip" data-tooltip-content="Pan (H)"
        >
          H
        </button>
      </div>
      <Tooltip id="toolbar-tooltip" place="bottom" />

      {!isFocusedView && (
        <aside className="hidden flex-col gap-4 lg:flex">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Templates</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">Workflow library</h3>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
              {workflows.length}
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setSelectedWorkflowId(null)
                setDraft({
                  ...defaultTemplate,
                  id: crypto.randomUUID(),
                  nodes: [],
                  edges: [],
                  settings: { ...defaultTemplate.settings },
                })
        setSelectedNodeIds(new Set())
                setSelectedEdgeId(null)
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                !selectedWorkflowId ? 'border-sky-400 bg-sky-50 text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-sky-300 hover:bg-sky-50'
              }`}
            >
              New template
            </button>

            {workflows.map((workflow) => (
              <button
                key={workflow._id}
                type="button"
                onClick={() => setSelectedWorkflowId(workflow._id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selectedWorkflowId === workflow._id
                    ? 'border-sky-400 bg-sky-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">{workflow.name}</div>
                <div className="mt-1 text-xs text-slate-500">{workflow.nodes?.length ?? 0} nodes</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Toolbar</p>
          <div className="mt-4 grid grid-cols-4 gap-2 overflow-y-auto">
            {WORKFLOW_NODE_CATALOG.map((node) => (
              <button
                key={node.type}
                type="button"
                draggable
                onDragStart={(event) => paletteDragStart(event, node.type)}
                onClick={() => addNode(node.type)}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-center transition hover:border-sky-300 hover:bg-sky-50"
                data-tooltip-id="workflow-tooltip"
                data-tooltip-content={node.label}
              >
                <node.icon className="h-5 w-5 text-slate-600" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Drag nodes onto the board or click to add them. Connect output ports on the right to input ports on the left.
          </p>
        </section>
        <Tooltip id="workflow-tooltip" place="top" />
      </aside>
      )}

      <section className="space-y-4">
        {!isFocusedView && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Workflow name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Short count</span>
              <input
                type="number"
                min="1"
                max="20"
                value={draft.settings.shortCount}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  settings: { ...current.settings, shortCount: Number(event.target.value) },
                }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Duration</span>
              <input
                type="number"
                min="10"
                max="120"
                value={draft.settings.shortDuration}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  settings: { ...current.settings, shortDuration: Number(event.target.value) },
                }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
          </div>

          <label className="mt-3 grid gap-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows="3"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveWorkflow}
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Save template
            </button>
            <button
              type="button"
              onClick={runWorkflow}
              className="rounded-xl border border-sky-300 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
            >
              Run workflow
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={() => selectedWorkflowId && onDelete(selectedWorkflowId)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Delete template
              </button>
            ) : null}
          </div>
        </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden bg-white shadow-sm">
          <div className="absolute right-4 top-4 z-10 text-xs text-slate-400">
            <AnimatePresence>
              {isSaving && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Saving...
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {justSaved && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Saved!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div 
            ref={boardRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
            // Native event listeners are attached in useEffect for passive: false
            // onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            // onPointerMove={handlePointerMove}
            className={`relative h-full min-h-screen overflow-hidden bg-[#fafafa] bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.28)_1px,transparent_0)] bg-[size:22px_22px] ${activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
            {isFocusedView && (
              <div className="absolute left-4 top-16 z-10">
                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-lg backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {WORKFLOW_NODE_CATALOG.map((node) => (
                      <button
                        key={node.type}
                        type="button"
                        draggable
                        onDragStart={(event) => paletteDragStart(event, node.type)}
                        onClick={() => addNode(node.type)}
                        className="flex aspect-square flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-2 text-center transition hover:border-sky-300 hover:bg-sky-50"
                        data-tooltip-id="workflow-tooltip"
                        data-tooltip-content={node.label}
                      >
                        <node.icon className="h-5 w-5 text-slate-600" />
                      </button>
                    ))}
                  </div>
                </div>
                <Tooltip id="workflow-tooltip" place="right" />
              </div>
            )}

            <div style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`, transformOrigin: '0 0' }}>
              <svg className="pointer-events-none inset-0 h-full w-full" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {drawingWire ? (
                  <g>
                    <path d={`M ${drawingWire.startX} ${drawingWire.startY} C ${(drawingWire.startX + drawingWire.x) / 2} ${drawingWire.startY}, ${(drawingWire.startX + drawingWire.x) / 2} ${drawingWire.y}, ${drawingWire.x} ${drawingWire.y}`} stroke="#60a5fa" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </g>
                ) : null}
                {edges.map((edge) => {
                  const source = nodeById.get(edge.source)
                  const target = nodeById.get(edge.target)
                  if (!source || !target) return null

                  const isSelected = edge.id === selectedEdgeId
                  const sourceX = source.position.x + 240
                  const sourceY = source.position.y + 90
                  const targetX = target.position.x
                  const targetY = target.position.y + 90

                  return (
                    <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedEdgeId(edge.id)}>
                      <path
                        d={`M ${sourceX} ${sourceY} C ${sourceX + 60} ${sourceY}, ${targetX - 60} ${targetY}, ${targetX} ${targetY}`}
                        stroke={isSelected ? '#0f172a' : '#94a3b8'}
                        strokeWidth={isSelected ? '3' : '2'}
                        fill="none"
                        strokeLinecap="round"
                      />
                      {edge.label ? (
                        <text x={(sourceX + targetX) / 2} y={((sourceY + targetY) / 2) - 8} fill="#0f172a" fontSize="12" textAnchor="middle">
                          {edge.label}
                        </text>
                      ) : null}
                    </g>
                  )
                })}
              </svg>

              {selectionBox && (
                <div
                  className="absolute border-2 border-dashed border-sky-500 bg-sky-500/10"
                  style={{
                    left: Math.min(selectionBox.startX, selectionBox.endX),
                    top: Math.min(selectionBox.startY, selectionBox.endY),
                    width: Math.abs(selectionBox.startX - selectionBox.endX),
                    height: Math.abs(selectionBox.startY - selectionBox.endY),
                  }}
                />
              )}

              {nodes.map((node) => {
                const active = node.id === activeNodeId
                const selected = selectedNodeIds.has(node.id)
                const nodeState = nodeStateById[node.id] ?? {}

                return (
                  <div
                    key={node.id}
                    style={{ left: node.position.x, top: node.position.y }}
                    className={`absolute w-[240px] rounded-2xl border p-3 transition ${getNodeFill(active, selected)}`}
                    onPointerDown={(e) => {
                      if (e.shiftKey) {
                        setSelectedNodeIds(ids => new Set(ids).add(node.id))
                      } else if (!selectedNodeIds.has(node.id)) {
                        setSelectedNodeIds(new Set([node.id]))
                      }
                      startDrag(node.id, e)
                    }}
                    onPointerMove={(e) => handleNodePointerMove(node.id, e)}
                    onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                  >
                    <div
                      onPointerDown={(event) => { if (activeTool === 'move') startDrag(node.id, event) }}
                      className="cursor-grab rounded-[1.1rem] border border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{catalogMap.get(node.type)?.group}</p>
                          <h4 className="text-sm font-medium text-slate-900">{node.label}</h4>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          #{node.order + 1}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-1 items-center justify-between gap-3">
                      <button
                        type="button"
                        data-port="input"
                        data-nodeid={node.id}
                        onClick={() => {
                          if (pendingSourceNodeId && pendingSourceNodeId !== node.id) {
                            createEdge(pendingSourceNodeId, node.id)
                            setPendingSourceNodeId(null)
                            return
                          }
                          setSelectedNodeIds(new Set([node.id]))
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                        title="Input port"
                      >
                        I
                      </button>

                      <div className="flex-1 text-center">
                        <div className="mt-1 text-[11px] text-slate-400">
                          {nodeState.status ? `${nodeState.status}` : 'idle'}
                        </div>
                      </div>

                      <button
                        type="button"
                        data-port="output"
                        data-nodeid={node.id}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          startWireDrag(node.id, event)
                        }}
                        onClick={() => {
                          setPendingSourceNodeId(node.id)
                          setSelectedNodeIds(new Set([node.id]))
                        }}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition ${
                          pendingSourceNodeId === node.id
                            ? 'border-sky-400 bg-sky-100 text-sky-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                        }`}
                        title="Output port"
                      >
                        O
                      </button>
                    </div>

                    {/* <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span>{Math.round(nodeState.progress ?? 0)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${active ? 'bg-sky-500' : 'bg-slate-500'}`}
                          style={{ width: `${Math.round(nodeState.progress ?? (active ? 60 : 0))}%` }}
                        />
                      </div>
                    </div> */}

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNodeIds(new Set([node.id]))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                      >
                        Configure
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moveNode(node.id, -1)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-300"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveNode(node.id, 1)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-300"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNode(node.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {contextMenu.visible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.1 }}
                className="absolute z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <button
                  onClick={() => {
                    duplicateNode(contextMenu.nodeId)
                    closeContextMenu()
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    removeNode(contextMenu.nodeId)
                    closeContextMenu()
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

        <aside className={`
          ${selectedNode || selectedEdge ? 'fixed right-0 top-0 h-full w-[360px] bg-white shadow-2xl z-[100] border-l border-slate-200 p-4 overflow-y-auto flex flex-col gap-4' : 'hidden'}
          xl:static xl:translate-x-0 xl:shadow-none xl:border-l-0 xl:p-0 xl:bg-transparent xl:flex xl:w-auto xl:h-auto
        `}>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Inspector</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">
                {selectedEdge ? 'Edge settings' : selectedNode ? 'Node settings' : 'Nothing selected'}
              </h3>
            </div>
            {(selectedNode || selectedEdge) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeIds(new Set())
                  setSelectedEdgeId(null)
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <span className="text-xl font-semibold leading-none">×</span>
              </button>
            )}
          </div>

          {selectedNode ? (
            <div className="mt-4 space-y-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Label</span>
                <input
                  value={selectedNode.label}
                  onChange={(event) => updateNode(selectedNode.id, { label: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                />
              </label>

              {selectedNode.type === 'caption_generation' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">STT & Translation</p>
                  
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">STT Language</span>
                    <select
                      value={selectedNode.config?.language ?? 'en'}
                      onChange={(event) => {
                        const newLang = event.target.value
                        const defaultFont = newLang === 'hi' ? 'Kohinoor Devanagari' : 'Impact'
                        updateNodeConfig(selectedNode.id, { language: newLang, fontName: defaultFont })
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (Devanagari)</option>
                      <option value="hinglish">Hinglish (Roman Hindi)</option>
                    </select>
                  </label>

                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 pt-2 border-t border-slate-200/60">Caption Styling</p>
                  
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Font Family</span>
                    <select
                      value={selectedNode.config?.fontName ?? (selectedNode.config?.language === 'hi' ? 'Kohinoor Devanagari' : 'Impact')}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { fontName: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                    >
                      {selectedNode.config?.language === 'hi' ? (
                        <>
                          <option value="Kohinoor Devanagari">Kohinoor Devanagari</option>
                          <option value="ITF Devanagari">ITF Devanagari</option>
                          <option value="Devanagari MT">Devanagari MT</option>
                          <option value="Arial">Arial</option>
                          <option value="Helvetica">Helvetica</option>
                        </>
                      ) : (
                        <>
                          <option value="Impact">Impact</option>
                          <option value="Arial Black">Arial Black</option>
                          <option value="Montserrat">Montserrat</option>
                          <option value="Futura">Futura</option>
                          <option value="Trebuchet MS">Trebuchet MS</option>
                        </>
                      )}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Font Size</span>
                    <input
                      type="number"
                      value={selectedNode.config?.fontSize ?? 24}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { fontSize: Number(event.target.value) })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Text Color</span>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={selectedNode.config?.textColor ?? '#FFFF00'}
                          onChange={(event) => updateNodeConfig(selectedNode.id, { textColor: event.target.value })}
                          className="h-10 w-12 rounded border border-slate-200 cursor-pointer bg-white"
                        />
                        <span className="text-xs text-slate-500">{selectedNode.config?.textColor ?? '#FFFF00'}</span>
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Stroke Color</span>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={selectedNode.config?.strokeColor ?? '#000000'}
                          onChange={(event) => updateNodeConfig(selectedNode.id, { strokeColor: event.target.value })}
                          className="h-10 w-12 rounded border border-slate-200 cursor-pointer bg-white"
                        />
                        <span className="text-xs text-slate-500">{selectedNode.config?.strokeColor ?? '#000000'}</span>
                      </div>
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Stroke Width</span>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={selectedNode.config?.strokeWidth ?? 2}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { strokeWidth: Number(event.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <span className="text-xs text-right text-slate-500">{selectedNode.config?.strokeWidth ?? 2} px</span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Alignment</span>
                    <select
                      value={selectedNode.config?.alignment ?? 'bottom'}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { alignment: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                    >
                      <option value="bottom">Bottom-Center</option>
                      <option value="center">Middle-Center</option>
                      <option value="top">Top-Center</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Vertical Offset</span>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={selectedNode.config?.verticalOffset ?? 50}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { verticalOffset: Number(event.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <span className="text-xs text-right text-slate-500">{selectedNode.config?.verticalOffset ?? 50} px</span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Text Case</span>
                    <select
                      value={selectedNode.config?.textCase ?? 'uppercase'}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { textCase: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                    >
                      <option value="uppercase">UPPERCASE</option>
                      <option value="lowercase">lowercase</option>
                      <option value="normal">Normal Case</option>
                    </select>
                  </label>

                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 pt-2 border-t border-slate-200/60">Video Layout</p>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Crop Mode</span>
                    <select
                      value={selectedNode.config?.cropMode ?? 'cropped'}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { cropMode: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                    >
                      <option value="cropped">Cropped (Full Vertical 9:16)</option>
                      <option value="uncropped">Uncropped (Letterbox / Fit)</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Zoom Level</span>
                    <input
                      type="range"
                      min="100"
                      max="200"
                      value={selectedNode.config?.zoomLevel ?? 100}
                      onChange={(event) => updateNodeConfig(selectedNode.id, { zoomLevel: Number(event.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <span className="text-xs text-right text-slate-500">{selectedNode.config?.zoomLevel ?? 100}%</span>
                  </label>

                  {/* Live Caption Preview */}
                  <div className="pt-4 border-t border-slate-200/60 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Live Preview</p>
                    
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Preview Text</span>
                      <input
                        value={selectedNode.config?.previewText ?? 'VIRAL FORGE AI'}
                        onChange={(event) => updateNodeConfig(selectedNode.id, { previewText: event.target.value })}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
                        placeholder="Type preview text..."
                      />
                    </label>

                    <div className="relative mx-auto w-full max-w-[180px] aspect-[9/16] rounded-3xl border-4 border-slate-800 bg-slate-950 overflow-hidden shadow-md">
                      {/* Video/Image Background */}
                      <div 
                        className="absolute inset-0 bg-slate-900 transition-all duration-300"
                        style={{
                          backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80')",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: (selectedNode.config?.cropMode ?? 'cropped') === 'cropped' ? 'cover' : 'contain',
                          transform: `scale(${(selectedNode.config?.zoomLevel ?? 100) / 100})`,
                        }}
                      />

                      {/* Caption Text overlay */}
                      <div 
                        className="absolute inset-x-2 flex items-center justify-center text-center pointer-events-none transition-all duration-300"
                        style={{
                          top: (selectedNode.config?.alignment ?? 'bottom') === 'top' ? `${selectedNode.config?.verticalOffset ?? 50}px` : undefined,
                          bottom: (selectedNode.config?.alignment ?? 'bottom') === 'bottom' ? `${selectedNode.config?.verticalOffset ?? 50}px` : undefined,
                          top: (selectedNode.config?.alignment ?? 'bottom') === 'center' ? '50%' : undefined,
                          transform: (selectedNode.config?.alignment ?? 'bottom') === 'center' ? 'translateY(-50%)' : undefined,
                        }}
                      >
                        <span 
                          style={{
                            fontFamily: selectedNode.config?.fontName ?? 'Impact',
                            fontSize: `${selectedNode.config?.fontSize ?? 24}px`,
                            color: selectedNode.config?.textColor ?? '#FFFF00',
                            WebkitTextStroke: `${selectedNode.config?.strokeWidth ?? 2}px ${selectedNode.config?.strokeColor ?? '#000000'}`,
                            textShadow: `0 2px 4px rgba(0,0,0,0.5)`,
                            textTransform: (selectedNode.config?.textCase ?? 'uppercase') === 'uppercase' ? 'uppercase' : (selectedNode.config?.textCase ?? 'uppercase') === 'lowercase' ? 'lowercase' : 'none',
                            fontWeight: 'bold',
                            wordBreak: 'break-word',
                            lineHeight: '1.2',
                          }}
                        >
                          {selectedNode.config?.previewText ?? 'VIRAL FORGE AI'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Node Config</p>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm text-slate-700">Note</span>
                      <textarea
                        value={selectedNode.config?.note ?? ''}
                        onChange={(event) => updateNodeConfig(selectedNode.id, { note: event.target.value })}
                        rows="3"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-700">Threshold</span>
                        <input
                          type="number"
                          step="0.05"
                          value={selectedNode.config?.threshold ?? 0.65}
                          onChange={(event) => updateNodeConfig(selectedNode.id, { threshold: Number(event.target.value) })}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-700">Language</span>
                        <input
                          value={selectedNode.config?.language ?? 'en'}
                          onChange={(event) => updateNodeConfig(selectedNode.id, { language: event.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-700">Duration</span>
                        <input
                          type="number"
                          value={selectedNode.config?.duration ?? 30}
                          onChange={(event) => updateNodeConfig(selectedNode.id, { duration: Number(event.target.value) })}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-700">Focus mode</span>
                        <select
                          value={selectedNode.config?.focusMode ?? 'auto'}
                          onChange={(event) => updateNodeConfig(selectedNode.id, { focusMode: event.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                        >
                          <option value="auto">Auto</option>
                          <option value="speaker">Speaker</option>
                          <option value="face">Face</option>
                          <option value="center">Center</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Reorder</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveNode(selectedNode.id, -1)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveNode(selectedNode.id, 1)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Move down
                  </button>
                </div>
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="mt-4 space-y-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Label</span>
                <input
                  value={selectedEdge.label ?? ''}
                  onChange={(event) => updateEdge(selectedEdge.id, { label: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Condition</span>
                  <select
                    value={selectedEdge.condition?.mode ?? 'always'}
                    onChange={(event) => updateEdge(selectedEdge.id, { condition: { mode: event.target.value } })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                  >
                    <option value="always">Always</option>
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not equals</option>
                    <option value="contains">Contains</option>
                    <option value="gt">Greater than</option>
                    <option value="gte">Greater or equal</option>
                    <option value="lt">Less than</option>
                    <option value="lte">Less or equal</option>
                    <option value="truthy">Truthy</option>
                    <option value="falsy">Falsy</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Field</span>
                  <input
                    value={selectedEdge.condition?.field ?? ''}
                    onChange={(event) => updateEdge(selectedEdge.id, { condition: { field: event.target.value } })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Operator value</span>
                  <input
                    value={selectedEdge.condition?.value ?? ''}
                    onChange={(event) => updateEdge(selectedEdge.id, { condition: { value: event.target.value } })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Operator hint</span>
                  <input
                    value={selectedEdge.condition?.operator ?? 'equals'}
                    onChange={(event) => updateEdge(selectedEdge.id, { condition: { operator: event.target.value } })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => removeEdge(selectedEdge.id)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Delete edge
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Select a node or edge to edit properties. Click an output port, then an input port, to create a connection.
            </div>
          )}
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Runs</p>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {workflowRuns.map((run) => (
              <button
                key={run._id}
                type="button"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{run.status}</span>
                  <span className="text-xs text-slate-500">{run.progress ?? 0}%</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">{run.currentStep}</div>
                {run.activeNodeId ? (
                  <div className="mt-2 text-xs text-sky-700">Active node: {run.activeNodeId.slice(0, 8)}</div>
                ) : null}
              </button>
            ))}
            {workflowRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No runs yet. Save a template and trigger a workflow.
              </div>
            ) : null}
          </div>
        </section>

        {project ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Project</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div>Name: {project?.name}</div>
              <div>Template: {selectedWorkflow?.name ?? draft.name}</div>
              <div>Nodes: {nodes.length}</div>
              <div>Edges: {edges.length}</div>
              <div>Runtime active node: {workflowRuntime.activeNodeId ? workflowRuntime.activeNodeId.slice(0, 8) : 'none'}</div>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  )
}