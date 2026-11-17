import { describe, expect, it } from 'vitest';
import {
  API_ERROR_STATUS, apiErrorSchema, deleteKnowledgeInputSchema,
  deleteProjectInputSchema, getConversationInputSchema,
  getPosthogConfigInputSchema, getProjectConversationsInputSchema,
  getProjectsInputSchema, getWidgetConfigInputSchema,
  patchProjectConfigInputSchema, patchProjectInputSchema,
  postClerkWebhookInputSchema, postKnowledgeFinalizeInputSchema,
  postKnowledgeInputSchema, postKnowledgeUploadUrlInputSchema,
  postProjectsInputSchema, postWidgetChatInputSchema,
} from './api';
import { APP_NAME, DEFAULT_WIDGET_CONFIG, MAX_KNOWLEDGE_FILE_BYTES, PLAN_LIMITS, getPlanLimits } from './limits';

const id = '123e4567-e89b-42d3-a456-426614174000';
const config = {
  buttonColor: '#123abc', position: 'top-left', label: 'Ask us',
  animation: 'slide', headerText: 'Welcome', showBadge: false,
};

describe('API route input schemas', () => {
  const cases = [
    ['GET /api/widget/config', getWidgetConfigInputSchema, { key: 'pk_abc' }, { key: 'bad' }],
    ['POST /api/widget/chat', postWidgetChatInputSchema,
      { key: 'pk_abc', visitorId: 'visitor', message: 'Hello' },
      { key: 'pk_abc', visitorId: 'visitor', message: 'x'.repeat(1_001) }],
    ['GET /api/projects', getProjectsInputSchema, {}, null],
    ['POST /api/projects', postProjectsInputSchema, { name: 'Project' }, { name: '' }],
    ['PATCH /api/projects/:id', patchProjectInputSchema, { id, name: 'New' }, { id, name: '' }],
    ['DELETE /api/projects/:id', deleteProjectInputSchema, { id }, { id: 'not-an-id' }],
    ['POST /api/projects/:id/knowledge', postKnowledgeInputSchema,
      { id, title: 'FAQ', text: 'Answer' }, { id, title: 'FAQ', text: '' }],
    ['POST /api/projects/:id/knowledge/upload-url', postKnowledgeUploadUrlInputSchema,
      { id, title: 'Guide', fileName: 'guide.pdf', contentType: 'application/pdf', sizeBytes: 1024 },
      { id, title: 'Guide', fileName: 'guide.exe', contentType: 'application/pdf', sizeBytes: 1024 }],
    ['POST /api/projects/:id/knowledge/finalize', postKnowledgeFinalizeInputSchema,
      { id, sourceId: id }, { id, sourceId: 'bad' }],
    ['DELETE /api/knowledge/:id', deleteKnowledgeInputSchema, { id }, { id: 'bad' }],
    ['GET /api/projects/:id/conversations', getProjectConversationsInputSchema,
      { id }, { id: 'bad' }],
    ['GET /api/conversations/:id', getConversationInputSchema, { id }, { id: 'bad' }],
    ['PATCH /api/projects/:id/config', patchProjectConfigInputSchema,
      { id, config }, { id, config: { ...config, buttonColor: 'red' } }],
    ['POST /api/clerk/webhook', postClerkWebhookInputSchema,
      { type: 'subscriptionItem.active', data: {} }, { type: '', data: {} }],
    ['GET /api/posthog-config', getPosthogConfigInputSchema, {}, null],
  ] as const;

  it.each(cases)('%s accepts valid input and rejects invalid input', (_route, schema, valid, invalid) => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse(invalid).success).toBe(false);
  });

  it('enforces the file size cap', () => {
    const input = { id, title: 'Guide', fileName: 'guide.pdf', contentType: 'application/pdf' };
    expect(postKnowledgeUploadUrlInputSchema.safeParse({ ...input, sizeBytes: MAX_KNOWLEDGE_FILE_BYTES }).success).toBe(true);
    expect(postKnowledgeUploadUrlInputSchema.safeParse({ ...input, sizeBytes: MAX_KNOWLEDGE_FILE_BYTES + 1 }).success).toBe(false);
    expect(postKnowledgeUploadUrlInputSchema.safeParse({ ...input, contentType: 'text/plain', sizeBytes: 1 }).success).toBe(false);
  });
});

describe('shared constants and errors', () => {
  it('keeps each plan limit in one place', () => {
    expect(APP_NAME).toBe('Askwell');
    expect(getPlanLimits('free')).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits('pro')).toBe(PLAN_LIMITS.pro);
    expect(PLAN_LIMITS.pro.projects).toBeGreaterThan(PLAN_LIMITS.free.projects);
    expect(PLAN_LIMITS.pro.messagesPerMonthPerProject).toBeGreaterThan(PLAN_LIMITS.free.messagesPerMonthPerProject);
    expect(PLAN_LIMITS.pro.knowledgeSourcesPerProject).toBeGreaterThan(PLAN_LIMITS.free.knowledgeSourcesPerProject);
    expect(DEFAULT_WIDGET_CONFIG.showBadge).toBe(true);
  });

  it('defines the standard error envelope and HTTP status', () => {
    expect(apiErrorSchema.safeParse({ error: { code: 'PAYMENT_REQUIRED', message: 'Upgrade' } }).success).toBe(true);
    expect(apiErrorSchema.safeParse({ error: { code: 'UNKNOWN', message: '' } }).success).toBe(false);
    expect(API_ERROR_STATUS.PAYMENT_REQUIRED).toBe(402);
    expect(API_ERROR_STATUS.RATE_LIMITED).toBe(429);
  });
});
