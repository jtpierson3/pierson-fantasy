const requiredEnvVars = [
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'SPORTMONKS_API_KEY',
    'CLERK_WEBHOOK_SECRET',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
    'SYNC_SECRET',
] as const

type EnvVar = typeof requiredEnvVars[number]

for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`)
    }
}

export const env = {
    DATABASE_URL: process.env.DATABASE_URL!,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    SPORTMONKS_API_KEY: process.env.SPORTMONKS_API_KEY!,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET!,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL!,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL!,
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL!,
    SYNC_SECRET: process.env.SYNC_SECRET!,
} satisfies Record<EnvVar, string>