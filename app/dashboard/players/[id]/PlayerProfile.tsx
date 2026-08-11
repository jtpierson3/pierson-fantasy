import Image from 'next/image'
import type { Player, Team } from '@prisma/client'
import { getPositionLabel } from '@/lib/positions'
import { getTeamColor, getContrastTextColor } from '@/lib/colors'

type PlayerWithTeam = Player & {
  team: Team | null
}

type Props = {
  player: PlayerWithTeam
}

function calculateAge(dateOfBirth: string | Date | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export default function PlayerProfile({ player }: Props) {
  const age = calculateAge(player.date_of_birth)

  const { primary } = getTeamColor(player.team?.name)
  const textColor = getContrastTextColor(primary)

  return (
    <div className="mx-auto p-6">
      <div 
        className="flex gap-6 rounded-xl p-6"
        style={{ backgroundColor: primary, color: textColor }}
      >
        {/* Left third — photo */}
        <div className="w-1/3 flex-shrink">
          <div 
            className="bg-white border border-gray-100 rounded-xl overflow-hidden"
            style={{ borderTopColor: primary}}
          >
            <div className="relative w-full aspect-square">
              {player.image_path ? (
                <Image
                  src={player.image_path}
                  alt={player.display_name}
                  fill
                  className="object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-medium">
                    {player.display_name[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle third — bio info */}
        <div className="w-1/3 flex-shrink-0">
          <h1 className="text-xl font-medium mb-4">
            {player.display_name}
          </h1>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm">Position</span>
              <span className="text-sm font-medium">
                {getPositionLabel(player.position_id)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm">Team</span>
              <span className="text-sm font-medium">
                {player.team?.name ?? '—'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm">Age</span>
              <span className="text-sm font-medium">
                {age ?? '—'}
              </span>
            </div>
            {player.jersey_number && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm">Number</span>
                <span className="text-sm font-medium">
                  #{player.jersey_number}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right third — position field (placeholder until lineup data exists) */}
        <div className="w-1/3 flex-shrink">
          <div className="bg-white border rounded-xl p-4 h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 text-center">
              Position map coming soon — requires match lineup data
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}