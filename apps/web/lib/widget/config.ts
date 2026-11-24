import 'server-only';

import {
  DEFAULT_WIDGET_CONFIG,
  widgetConfigInputSchema,
  type WidgetConfig,
} from '@askwell/shared';
import type { Database } from '../../../../packages/db/types';

type ConfigRow = Pick<Database['public']['Tables']['widget_configs']['Row'],
  'button_color' | 'position' | 'label' | 'animation' | 'header_text' | 'show_badge'>;

/** Apply the current server-read plan before exposing any stored customization. */
export function publicWidgetConfig(plan: 'free' | 'pro', row: ConfigRow | null): WidgetConfig {
  if (plan === 'free') return { ...DEFAULT_WIDGET_CONFIG, showBadge: true };
  if (!row) throw new Error('Widget config missing');

  return widgetConfigInputSchema.parse({
    buttonColor: row.button_color,
    position: row.position,
    label: row.label,
    animation: row.animation,
    headerText: row.header_text,
    showBadge: row.show_badge,
  });
}
