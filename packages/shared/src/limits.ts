export const APP_NAME = 'Askwell';

export const PLAN_LIMITS = {
  free: { projects: 1, messagesPerMonthPerProject: 100, knowledgeSourcesPerProject: 3, canCustomize: false },
  pro: { projects: 5, messagesPerMonthPerProject: 2_000, knowledgeSourcesPerProject: 25, canCustomize: true },
} as const;
export type Plan = keyof typeof PLAN_LIMITS;
export const MAX_KNOWLEDGE_FILE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_WIDGET_CONFIG = {
  buttonColor: '#000000', position: 'bottom-right', label: 'Chat with us',
  animation: 'fade', headerText: 'How can we help?', showBadge: true,
} as const;
export function getPlanLimits(plan: Plan) { return PLAN_LIMITS[plan]; }
