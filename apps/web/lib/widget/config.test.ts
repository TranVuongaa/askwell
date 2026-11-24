import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_WIDGET_CONFIG } from '@askwell/shared';

vi.mock('server-only', () => ({}));

import { publicWidgetConfig } from './config';

describe('publicWidgetConfig', () => {
  it('keeps Free on the shared defaults even if customization is stored', () => {
    expect(publicWidgetConfig('free', {
      button_color: '#123456', position: 'top-left', label: 'Custom',
      animation: 'slide', header_text: 'Custom heading', show_badge: false,
    })).toEqual({ ...DEFAULT_WIDGET_CONFIG, showBadge: true });
  });

  it('maps and validates the Pro config', () => {
    expect(publicWidgetConfig('pro', {
      button_color: '#123456', position: 'top-left', label: 'Custom',
      animation: 'slide', header_text: 'Custom heading', show_badge: false,
    })).toEqual({
      buttonColor: '#123456', position: 'top-left', label: 'Custom',
      animation: 'slide', headerText: 'Custom heading', showBadge: false,
    });
  });
});
