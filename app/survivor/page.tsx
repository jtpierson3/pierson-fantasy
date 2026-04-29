import { prisma } from "../../lib/prisma";
import { ContestantCard } from "../components/survivor/contestant-card";
import { ScoringFeed } from "../components/survivor/scoring-feed";
import { StatCard } from "../components/survivor/stat-card";
import { auth } from '@clerk/nextjs/server'

export default async function SurvivorDashboard() {
    // need to set up actual user authorization.
    const { userId } = await auth();

    const userTeam = await prisma.survivorPicks.findMany();

    return (
        <div className="p-6 space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Your Tribe</h1>
                <p className="text-muted-foreground">Season 50: In the Hands of the Fans</p>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Points" value="142" trend="+12" />
                <StatCard title="Active Members" value ="4/6" subtitle="2 Voted Out" />
                <StatCard title="LeagueRank" value="#4" subtitle="out of 12 players" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Your Tribe</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {userTeam.map((survivorPick) => (
                            <ContestantCard key={survivorPick.id} />
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Recent Points</h2>
                    <ScoringFeed />
                </div>
            </div>
        </div>
    );
}