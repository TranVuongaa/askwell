import { clerkMiddleware } from '@clerk/nextjs/server';
import { protectOwnerRequest } from './lib/auth/routes';

export default clerkMiddleware(async (auth, request) => {
  await protectOwnerRequest(request.nextUrl.pathname, auth);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
