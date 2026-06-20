import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import './MenuConfigView.css';

function SortableRow({ item, isHidden, onToggleHidden }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`menu-cfg-row${isHidden ? ' is-hidden' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button
        className="menu-cfg-handle"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar"
      >
        <GripVertical size={18} strokeWidth={2} />
      </button>
      <item.Icon size={18} strokeWidth={2} className="menu-cfg-icon" />
      <span className="menu-cfg-label">{item.label}</span>
      <button
        className={`menu-cfg-eye${isHidden ? ' is-hidden' : ''}`}
        onClick={() => onToggleHidden(item.id)}
        aria-label={isHidden ? 'Mostrar' : 'Ocultar'}
      >
        {isHidden ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
      </button>
    </div>
  );
}

export default function MenuConfigView({ navViews, config, onToggleHidden, onReorder }) {
  const orderedViews = config.order
    .map(id => navViews.find(v => v.id === id))
    .filter(Boolean);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = orderedViews.findIndex(v => v.id === active.id);
    const newIndex = orderedViews.findIndex(v => v.id === over.id);
    const newOrder = arrayMove(orderedViews, oldIndex, newIndex).map(v => v.id);
    onReorder(newOrder);
  };

  return (
    <div className="menu-cfg-body">
      <p className="menu-cfg-hint">
        Arrastra para reordenar. Toca el ojo para ocultar secciones que no uses.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedViews.map(v => v.id)} strategy={verticalListSortingStrategy}>
          <div className="menu-cfg-list">
            {orderedViews.map((item, i) => (
              <React.Fragment key={item.id}>
                <SortableRow
                  item={item}
                  isHidden={config.hidden.includes(item.id)}
                  onToggleHidden={onToggleHidden}
                />
                {i < orderedViews.length - 1 && <div className="menu-cfg-divider" />}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
