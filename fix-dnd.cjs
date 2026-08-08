const fs = require('fs');
let content = fs.readFileSync('src/routes/index.tsx', 'utf8');

// 1. Imports
if (!content.includes('@dnd-kit/core')) {
  content = content.replace('import { toPng } from "html-to-image";', `import { toPng } from "html-to-image";\nimport { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, defaultDropAnimationSideEffects } from '@dnd-kit/core';\nimport { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';\nimport { CSS } from '@dnd-kit/utilities';`);
  
  content = content.replace(/import\s+{([^}]*)}\s+from\s+"lucide-react";/, (match, p1) => {
    if (!p1.includes('GripVertical')) {
        let inner = p1.trim();
        if (inner.endsWith(',')) inner = inner.slice(0, -1);
        return `import { ${inner}, GripVertical } from "lucide-react";`;
    }
    return match;
  });
}

// 2. Grain function hooks
const grainHookMarker = `function Grain({ user }: { user?: any }) {`;
const grainHooks = `
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeDragHabit, setActiveDragHabit] = useState<any>(null);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const habit = flatHabits.find((h: any) => h.id === active.id);
    if (habit) setActiveDragHabit(habit);
  };

  const handleDragEnd = async (event: any) => {
    setActiveDragHabit(null);
    const { active, over } = event;
    if (!over) return;
    
    const activeHabit = flatHabits.find((h: any) => h.id === active.id);
    if (!activeHabit) return;

    let targetQuadrant = activeHabit.quadrant;
    let targetOrder = activeHabit.order;

    if (["q1", "q2", "q3", "q4"].includes(over.id)) {
        targetQuadrant = over.id;
        const quadrantHabits = habits[targetQuadrant as keyof typeof habits] || [];
        targetOrder = quadrantHabits.length > 0 ? quadrantHabits[quadrantHabits.length - 1].order + 1 : 0;
    } else {
        const overHabit = flatHabits.find((h: any) => h.id === over.id);
        if (overHabit) {
            targetQuadrant = overHabit.quadrant;
            targetOrder = overHabit.order;
        }
    }

    if (activeHabit.quadrant !== targetQuadrant || activeHabit.order !== targetOrder) {
        await updateHabit(active.id, { quadrant: targetQuadrant, order: targetOrder + 0.1 }); 
    }
  };
`;
if (!content.includes('handleDragStart')) {
  content = content.replace(grainHookMarker, grainHookMarker + grainHooks);
}

// 3. Wrapping Matrix with DndContext
const matrixStart = `{/* TAB 3: MATRIX */}
            {activeTab === "matrix" && (
              <div className="animate-tab-fade pt-12">
                <section className="px-5">`;

const matrixStartReplacement = `{/* TAB 3: MATRIX */}
            {activeTab === "matrix" && (
              <div className="animate-tab-fade pt-12">
                <section className="px-5">
                  <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>`;

const matrixEnd = `                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB 4: WALLPAPER */}`;

const matrixEndReplacement = `                      ))}
                    </div>
                  )}
                  <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
                    {activeDragHabit ? (
                        <div className="opacity-80">
                           <HabitRow habit={activeDragHabit} justDone={false} menuOpen={false} onMenuToggle={() => {}} onMenuClose={() => {}} onToggle={() => {}} onRest={() => {}} onPin={() => {}} onDelete={() => {}} onMove={() => {}} onEdit={() => {}} onAdjust={() => {}} onOpenDetail={() => {}} isDragOverlay={true} />
                        </div>
                    ) : null}
                  </DragOverlay>
                  </DndContext>
                </section>
              </div>
            )}

            {/* TAB 4: WALLPAPER */}`;

content = content.replace(matrixStart, matrixStartReplacement);
content = content.replace(matrixEnd, matrixEndReplacement);

// 4. QuadrantCard
const qCardHookBody = `}) {
  const { setNodeRef } = useDroppable({ id: q });
  const meta = QUADRANTS[q];`;

if (!content.includes('useDroppable({ id: q })')) {
  content = content.replace(/}\) {\s*const meta = QUADRANTS\[q\];/, qCardHookBody);
}

const qCardContentStart = `{!collapsed && (
        <div className="px-3 pb-3 pt-0 space-y-1.5">`;
const qCardContentStartReplacement = `{!collapsed && (
        <div className="px-3 pb-3 pt-0 space-y-1.5" ref={setNodeRef}>
          <SortableContext items={visible.map(h => h.h.id)} strategy={verticalListSortingStrategy}>`;

const qCardContentEnd = `          {visible.length === 0 && (
            <div className="py-2.5 text-center text-[11px] font-medium text-mute">
              No habits scheduled
            </div>
          )}
        </div>
      )}
    </div>
  );
}`;
const qCardContentEndReplacement = `          {visible.length === 0 && (
            <div className="py-2.5 text-center text-[11px] font-medium text-mute">
              No habits scheduled
            </div>
          )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}`;

if (!content.includes('<SortableContext')) {
  content = content.replace(qCardContentStart, qCardContentStartReplacement);
  content = content.replace(qCardContentEnd, qCardContentEndReplacement);
}

// 5. HabitRow
const habitRowStart = `function HabitRow({
  habit: h,
  justDone,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
}: {
  habit: Habit;
  justDone: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onToggle: () => void;
  onRest: () => void;
  onPin: () => void;
  onDelete: () => void;
  onMove: () => void;
  onEdit: () => void;
  onAdjust: (dir: 1 | -1) => void;
  onOpenDetail: () => void;
}) {`;

const habitRowStartReplacement = `function HabitRow({
  habit: h,
  justDone,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
  isDragOverlay,
}: {
  habit: Habit;
  justDone: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onToggle: () => void;
  onRest: () => void;
  onPin: () => void;
  onDelete: () => void;
  onMove: () => void;
  onEdit: () => void;
  onAdjust: (dir: 1 | -1) => void;
  onOpenDetail: () => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: h.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
`;

if (!content.includes('isDragOverlay?: boolean;')) {
  content = content.replace(habitRowStart, habitRowStartReplacement);
}

const habitRowWrapper = `return (
    <div
      className={\`group relative overflow-hidden bg-canvas transition-all duration-300 \${
        justDone
          ? "scale-[0.98] rounded-xl ring-2 ring-[color:var(--primary)] ring-offset-2 ring-offset-canvas"
          : "rounded-none"
      } \${menuOpen ? "z-10 ring-1 ring-[color:var(--hairline)]" : ""}\`}
    >`;
const habitRowWrapperReplacement = `return (
    <div
      ref={setNodeRef}
      style={style}
      className={\`group relative overflow-hidden bg-canvas transition-all duration-300 \${
        justDone
          ? "scale-[0.98] rounded-xl ring-2 ring-[color:var(--primary)] ring-offset-2 ring-offset-canvas"
          : "rounded-none"
      } \${menuOpen ? "z-10 ring-1 ring-[color:var(--hairline)]" : ""}\`}
    >`;
if (!content.includes('ref={setNodeRef}\n      style={style}')) {
  content = content.replace(habitRowWrapper, habitRowWrapperReplacement);
}

const numericIcon = `{isNumeric ? (
          <div className="grid h-5 w-5 shrink-0 place-items-center border-2 border-ink text-ink bg-canvas-soft">
            <Droplets className="h-3 w-3" />
          </div>
        ) : (`;

const numericIconReplacement = `{!isDragOverlay && (
          <div {...attributes} {...listeners} className="cursor-grab p-1 text-mute hover:text-ink active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        {isNumeric ? (
          <div className="grid h-5 w-5 shrink-0 place-items-center border-2 border-ink text-ink bg-canvas-soft">
            <Droplets className="h-3 w-3" />
          </div>
        ) : (`;

if (!content.includes('<GripVertical')) {
  content = content.replace(numericIcon, numericIconReplacement);
}

fs.writeFileSync('src/routes/index.tsx', content, 'utf8');
console.log('done');
