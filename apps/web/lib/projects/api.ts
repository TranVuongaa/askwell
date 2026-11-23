import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  API_ERROR_STATUS,
  type ApiError,
  type ApiErrorCode,
  type Project,
} from '@askwell/shared';
import type { Database } from '../../../../packages/db/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

export function projectResponse(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    publicKey: row.public_key,
    messagesUsed: row.messages_used,
    periodStart: row.period_start,
    createdAt: row.created_at,
  };
}

export function newPublicKey(): string {
  return `pk_${randomUUID().replaceAll('-', '')}`;
}

export function apiError(code: ApiErrorCode, message: string): Response {
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status: API_ERROR_STATUS[code] });
}
