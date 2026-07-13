import type Konva from 'konva'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Transformer } from 'react-konva'
import type { CanvasElement, ElementTransform } from '../types/canvas'

interface SelectionTransformerProps {
  stageRef: RefObject<Konva.Stage | null>
  selectedElement: CanvasElement | null
  onTransformEnd: (id: string, transform: ElementTransform) => void
}

const minimumSize = 10

export function SelectionTransformer({
  stageRef,
  selectedElement,
  onTransformEnd,
}: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer | null>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage || !selectedElement) {
      transformer?.nodes([])
      return
    }

    const selectedNode = stage.findOne((node: Konva.Node) => node.id() === selectedElement.id)
    transformer.nodes(selectedNode ? [selectedNode] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedElement, stageRef])

  const handleTransformEnd = () => {
    const node = transformerRef.current?.nodes()[0]
    if (!node || !selectedElement || selectedElement.type === 'line') return

    const scaleX = Math.abs(node.scaleX())
    const scaleY = Math.abs(node.scaleY())
    const base = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    }
    let transform: ElementTransform

    if (selectedElement.type === 'rectangle') {
      transform = {
        ...base,
        width: Math.max(minimumSize, selectedElement.width * scaleX),
        height: Math.max(minimumSize, selectedElement.height * scaleY),
      }
    } else if (selectedElement.type === 'circle') {
      transform = {
        ...base,
        radiusX: Math.max(minimumSize / 2, selectedElement.radiusX * scaleX),
        radiusY: Math.max(minimumSize / 2, selectedElement.radiusY * scaleY),
      }
    } else {
      transform = {
        ...base,
        width: Math.max(minimumSize, selectedElement.width * scaleX),
        fontSize: Math.max(minimumSize, selectedElement.fontSize * scaleY),
      }
    }

    node.scale({ x: 1, y: 1 })
    onTransformEnd(selectedElement.id, transform)
  }

  const canTransform = Boolean(selectedElement && selectedElement.type !== 'line')

  return (
    <Transformer
      ref={transformerRef}
      name="selection-transformer"
      resizeEnabled={canTransform}
      rotateEnabled={canTransform}
      enabledAnchors={
        canTransform
          ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']
          : []
      }
      flipEnabled={false}
      padding={6}
      rotateAnchorOffset={28}
      borderStroke="#4f46e5"
      borderStrokeWidth={2}
      anchorFill="#ffffff"
      anchorStroke="#4f46e5"
      anchorStrokeWidth={2}
      anchorSize={10}
      onTransformEnd={handleTransformEnd}
      boundBoxFunc={(oldBox, newBox) =>
        Math.abs(newBox.width) < minimumSize || Math.abs(newBox.height) < minimumSize
          ? oldBox
          : newBox
      }
    />
  )
}
