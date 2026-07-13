import { Ellipse, Group, Line, Rect, Text } from 'react-konva'
import type { CanvasElement } from '../types/canvas'

interface AIGenerationPreviewProps {
  elements: CanvasElement[]
}

export function AIGenerationPreview({ elements }: AIGenerationPreviewProps) {
  return (
    <Group name="ai-generation-preview" listening={false} opacity={0.62}>
      {elements.map((element) => {
        switch (element.type) {
          case 'line':
            return (
              <Line
                key={element.id}
                points={element.points}
                stroke={element.color}
                strokeWidth={element.strokeWidth}
                rotation={element.rotation}
                dash={[8, 6]}
                lineCap="round"
                lineJoin="round"
              />
            )
          case 'rectangle':
            return (
              <Rect
                key={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation}
                stroke={element.color}
                strokeWidth={element.strokeWidth}
                fill="rgba(99,102,241,0.10)"
                dash={[8, 6]}
              />
            )
          case 'circle':
            return (
              <Ellipse
                key={element.id}
                x={element.x}
                y={element.y}
                radiusX={element.radiusX}
                radiusY={element.radiusY}
                rotation={element.rotation}
                stroke={element.color}
                strokeWidth={element.strokeWidth}
                fill="rgba(99,102,241,0.10)"
                dash={[8, 6]}
              />
            )
          case 'text':
            return (
              <Text
                key={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                text={element.text}
                fill={element.color}
                fontSize={element.fontSize}
                rotation={element.rotation}
                fontFamily="Inter, sans-serif"
              />
            )
        }
      })}
    </Group>
  )
}
