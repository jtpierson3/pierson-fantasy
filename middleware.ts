import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher ([
    '/sign-in(.*)',
    '/api/webhooks(.*)',
    '/api/sportmonks(.*)',
    '/api/sync(.*)',
    '/api/survivor(.*)',
    '/api/waivers(.*)',
    '/api/transfer-and-waiver-processing(.*)',
    '/api/admin/api-usage/rollup(.*)',
])

export default clerkMiddleware(async(auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
}