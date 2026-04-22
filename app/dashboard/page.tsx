import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function Dashboard() {
    const { userId } = await auth()

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
            <h1 className="text-3xl font-bold">Pierson Fantasy</h1>
            <p className="text-gray-500">User ID: {userId}</p>
            <UserButton />
        </main>
    )
}