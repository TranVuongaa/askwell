import { z } from 'zod';
import { MAX_KNOWLEDGE_FILE_BYTES, type Plan } from './limits';

const id = z.uuid();
const projectId = z.object({ id });
const sourceId = z.object({ id });
const conversationId = z.object({ id });
const empty = z.object({});
const name = z.string().trim().min(1).max(120);
const title = z.string().trim().min(1).max(200);
const publicKey = z.string().regex(/^pk_[A-Za-z0-9_-]+$/);

export type ApiErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'PAYMENT_REQUIRED' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED'
  | 'MESSAGE_BLOCKED' | 'CONFLICT' | 'INTERNAL_ERROR';
export type ApiError = { error: { code: ApiErrorCode; message: string } };
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  PAYMENT_REQUIRED: 402, RATE_LIMITED: 429, QUOTA_EXCEEDED: 429,
  MESSAGE_BLOCKED: 403, CONFLICT: 409, INTERNAL_ERROR: 500,
};
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      'BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND',
      'PAYMENT_REQUIRED', 'RATE_LIMITED', 'QUOTA_EXCEEDED',
      'MESSAGE_BLOCKED', 'CONFLICT', 'INTERNAL_ERROR',
    ]),
    message: z.string().min(1),
  }),
});

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type WidgetAnimation = 'fade' | 'slide' | 'scale';
export type WidgetConfig = {
  buttonColor: string; position: WidgetPosition; label: string;
  animation: WidgetAnimation; headerText: string; showBadge: boolean;
};
export const widgetConfigInputSchema = z.object({
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']),
  label: z.string().trim().min(1).max(80),
  animation: z.enum(['fade', 'slide', 'scale']),
  headerText: z.string().trim().min(1).max(120),
  showBadge: z.boolean(),
});
export type Project = {
  id: string; name: string; publicKey: string; messagesUsed: number;
  periodStart: string; createdAt: string;
};
export type KnowledgeSource = {
  id: string; projectId: string; title: string; type: 'text' | 'pdf' | 'md' | 'txt';
  status: 'uploading' | 'processing' | 'ready' | 'failed'; createdAt: string;
};
export type ConversationSummary = {
  id: string; projectId: string; preview: string; messageCount: number;
  createdAt: string; lastMessageAt: string;
};
export type ConversationMessage = {
  id: string; role: 'visitor' | 'bot'; body: string; createdAt: string;
};

// GET /api/widget/config
export const getWidgetConfigInputSchema = z.object({ key: publicKey });
export type GetWidgetConfigInput = z.infer<typeof getWidgetConfigInputSchema>;
export type GetWidgetConfigResponse = { config: WidgetConfig };
// POST /api/widget/chat
export const postWidgetChatInputSchema = z.object({
  key: publicKey, visitorId: z.string().min(1).max(128),
  conversationId: id.optional(), message: z.string().trim().min(1).max(1_000),
});
export type PostWidgetChatInput = z.infer<typeof postWidgetChatInputSchema>;
export type PostWidgetChatResponse = { conversationId: string; reply: string };

// GET /api/projects
export const getProjectsInputSchema = empty;
export type GetProjectsInput = z.infer<typeof getProjectsInputSchema>;
export type GetProjectsResponse = { projects: Project[]; plan: Plan };
// POST /api/projects
export const postProjectsInputSchema = z.object({ name });
export type PostProjectsInput = z.infer<typeof postProjectsInputSchema>;
export type PostProjectsResponse = { project: Project };
// PATCH /api/projects/:id
export const patchProjectInputSchema = projectId.extend({ name });
export type PatchProjectInput = z.infer<typeof patchProjectInputSchema>;
export type PatchProjectResponse = { project: Project };
// DELETE /api/projects/:id
export const deleteProjectInputSchema = projectId;
export type DeleteProjectInput = z.infer<typeof deleteProjectInputSchema>;
export type DeleteProjectResponse = { success: true };
// POST /api/projects/:id/knowledge
export const postKnowledgeInputSchema = projectId.extend({
  title, text: z.string().trim().min(1).max(1_000_000),
});
export type PostKnowledgeInput = z.infer<typeof postKnowledgeInputSchema>;
export type PostKnowledgeResponse = { source: KnowledgeSource };
// POST /api/projects/:id/knowledge/upload-url
export const postKnowledgeUploadUrlInputSchema = projectId.extend({
  title, fileName: z.string().trim().min(1).max(255).regex(/\.(pdf|md|txt)$/i),
  contentType: z.enum(['application/pdf', 'text/markdown', 'text/plain']),
  sizeBytes: z.number().int().positive().max(MAX_KNOWLEDGE_FILE_BYTES),
}).refine(({ fileName, contentType }) => {
  const extension = fileName.split('.').at(-1)?.toLowerCase();
  return (extension === 'pdf' && contentType === 'application/pdf')
    || (extension === 'md' && contentType === 'text/markdown')
    || (extension === 'txt' && contentType === 'text/plain');
}, { message: 'File extension and content type must match' });
export type PostKnowledgeUploadUrlInput = z.infer<typeof postKnowledgeUploadUrlInputSchema>;
export type PostKnowledgeUploadUrlResponse = {
  source: KnowledgeSource; signedUrl: string; token: string; path: string;
};
// POST /api/projects/:id/knowledge/finalize
export const postKnowledgeFinalizeInputSchema = projectId.extend({ sourceId: id });
export type PostKnowledgeFinalizeInput = z.infer<typeof postKnowledgeFinalizeInputSchema>;
export type PostKnowledgeFinalizeResponse = { source: KnowledgeSource };
// DELETE /api/knowledge/:id
export const deleteKnowledgeInputSchema = sourceId;
export type DeleteKnowledgeInput = z.infer<typeof deleteKnowledgeInputSchema>;
export type DeleteKnowledgeResponse = { success: true };
// GET /api/projects/:id/conversations
export const getProjectConversationsInputSchema = projectId;
export type GetProjectConversationsInput = z.infer<typeof getProjectConversationsInputSchema>;
export type GetProjectConversationsResponse = { conversations: ConversationSummary[] };
// GET /api/conversations/:id
export const getConversationInputSchema = conversationId;
export type GetConversationInput = z.infer<typeof getConversationInputSchema>;
export type GetConversationResponse = {
  conversation: ConversationSummary; messages: ConversationMessage[];
};
// PATCH /api/projects/:id/config
export const patchProjectConfigInputSchema = projectId.extend({ config: widgetConfigInputSchema });
export type PatchProjectConfigInput = z.infer<typeof patchProjectConfigInputSchema>;
export type PatchProjectConfigResponse = { config: WidgetConfig };
// POST /api/clerk/webhook. Verify the signature before parsing the event body.
export const postClerkWebhookInputSchema = z.object({
  type: z.string().min(1), data: z.record(z.string(), z.unknown()),
});
export type PostClerkWebhookInput = z.infer<typeof postClerkWebhookInputSchema>;
export type PostClerkWebhookResponse = { success: true };
// GET /api/posthog-config
export const getPosthogConfigInputSchema = empty;
export type GetPosthogConfigInput = z.infer<typeof getPosthogConfigInputSchema>;
export type GetPosthogConfigResponse = { key: string; host: string };
