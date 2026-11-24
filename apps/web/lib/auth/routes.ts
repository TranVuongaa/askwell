import { NextResponse } from 'next/server';

const ownerApiPrefixes = ['/api/projects', '/api/knowledge', '/api/conversations'];

export function isOwnerApiPath(pathname: string) {
  return ownerApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function protectOwnerRequest(
  pathname: string,
  auth: (() => Promise<{ userId: string | null }>) & { protect: () => Promise<unknown> },
): Promise<Response | undefined> {
  const isDashboardPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  if (isDashboardPath) {
    await auth.protect();
    return;
  }

  if (isOwnerApiPath(pathname)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }
  }
}
