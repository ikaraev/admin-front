import { createContext, use } from 'react';
import type { DragData } from './dnd';
import type { DropIntent, Refusal } from './useBuilderDnd';

/** What drop zones need to highlight themselves: the dragged item, where it would land, and the last refusal. */
export interface DndUiState { active: DragData | null; intent: DropIntent | null; refusal: Refusal | null }

export const DndUiContext = createContext<DndUiState>({ active: null, intent: null, refusal: null });

export const useDndUi = () => use(DndUiContext);

/** The refusal message for a zone, while a drag hovers it or for 2 s after a refused drop. */
export function refusalFor(state: DndUiState, zoneId: string): string | null {
  if (state.intent?.kind === 'refuse' && state.intent.zoneId === zoneId) return state.intent.message;
  if (state.refusal?.zoneId === zoneId) return state.refusal.message;
  return null;
}
