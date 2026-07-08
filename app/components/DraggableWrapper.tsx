'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Props = {
    id: string
    children: React.ReactNode
    onClick?: (e: React.MouseEvent) => void
    className?: string
}

export default function DraggableWrapper({ id, children, onClick, className }: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={className ?? 'cursor-grab active:cursor-grabbing'}
        >
            {children}
        </div>
    )
}