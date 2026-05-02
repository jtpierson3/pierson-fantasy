import Image from "next/image"
import { getPositionColor, getPositionShort } from "@/lib/helpers"

type Player = {
    id: number
    display_name: string
    image_path: string
    position_id: number
    jersey_number?: number | null
    date_of_birth?: string | null
    teamId?: number
}

type Props = {
    player: Player,
    size?: 'sm' | 'md'
    showName?: boolean
    points?: number
}

export default function PlayerCard({ player, size = 'md', showName = true, points }: Props) {
    const imageSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
    const borderColor = size === 'sm' ? 'border' : 'border-2'

    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`relative ${imageSize}`}>
                <Image 
                    src={player.image_path}
                    alt={player.display_name}
                    fill
                    className={`object-contain rounded-full bg-white ${borderColor} border-white shadow-sm`}
                />
            </div>
            {showName && (
                <div className="flex flex-col items-center gap-1 mt-0.5">
                    <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                        {player.display_name.split(' ').pop()}
                    </p>
                    <span className={`text-xs px-1 rounded font-medium border ${getPositionColor(player.position_id)}`}>
                        {getPositionShort(player.position_id)}
                    </span>
                    {points !== undefined && (
                        <span className="text-xs font-medium bg-gray-800 text-white px-1.5 py0.5 rounded-md">
                            {points}pts
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}