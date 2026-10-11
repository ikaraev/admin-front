import { findRow, findWidget } from '../../lib/layout';
import { RowSettingsForm } from './RowSettingsForm';
import { useBuilder } from './WidgetBuilderProvider';
import { WidgetSettingsForm } from './WidgetSettingsForm';

/** The right pane: settings of whatever is selected. */
export function Inspector() {
  const { state, activePage } = useBuilder();
  const { selection } = state;
  if (selection?.kind === 'widget') {
    const widget = findWidget(state.pages, selection.widgetId);
    if (widget) return <WidgetSettingsForm key={widget.id} widget={widget} />;
  }
  if (selection?.kind === 'row' || selection?.kind === 'block') {
    const row = findRow(activePage, selection.rowId);
    const index = activePage.rows.findIndex((item) => item.id === selection.rowId);
    if (row) return <div className="flex flex-col gap-3">
      {selection.kind === 'block' ? <p className="text-sm text-muted-foreground">Block {selection.blockIndex + 1} is selected: the palette’s + adds metrics to it.</p> : null}
      <RowSettingsForm row={row} index={index} />
    </div>;
  }
  return <p className="text-sm text-muted-foreground">Drag a metric into a block, or select a widget or a row to edit it.</p>;
}
