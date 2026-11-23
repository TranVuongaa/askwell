const ownerApiPrefixes = ['/api/projects', '/api/knowledge', '/api/conversations'];

export function isOwnerApiPath(pathname: string) {
  return ownerApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function protectOwnerRequest(
  pathname: string,
  auth: { protect: () => Promise<unknown> },
) {
  const isDashboardPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  if (isDashboardPath || isOwnerApiPath(pathname)) {
    await auth.protect();
  }
}
