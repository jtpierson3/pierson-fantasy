import Image from "next/image"
import { getPositionColor, getPositionShort } from "@/lib/helpers"
import { isPremierLeagueEligible } from "@/lib/playerEligibility"
import { DisplayPlayer } from "@/lib/playerTypes"


type Props = {
    player: DisplayPlayer,
    size?: 'sm' | 'md'
    showName?: boolean
    points?: number
    positionLabel?: string
    outOfPosition?: boolean
    isHomeTeam?: boolean
    sidelinedInfo?: { category: string; typeName: string; endDate: string | null } | null
}

export default function PlayerCard({ player, size = 'md', showName = true, points, positionLabel, outOfPosition, isHomeTeam, sidelinedInfo }: Props) {
    const imageSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
    const borderWidth = size === 'sm' ? 'border' : 'border-2'
    const eligible = isPremierLeagueEligible(player.team?.leagueId)

    // I tried using tailwind here but it kept failing, moving to inline style.
    const borderColorHex =
        isHomeTeam === true ? '#fb923c' :
        isHomeTeam === false ? '#60a5fa' :
        '#ffffff'

    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`relative ${imageSize}`}>
                <Image 
                    src={player.image_path}
                    alt={player.display_name}
                    fill
                    sizes="32px"
                    className={`object-contain rounded-full bg-white ${borderWidth} shadow-sm`}
                    style={{ borderColor: borderColorHex}}
                />
                {sidelinedInfo && (
                    <div
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-sm group cursor-help"
                        title={`${sidelinedInfo.typeName}${sidelinedInfo.endDate ? ` (until ${new Date(sidelinedInfo.endDate).toLocaleDateString()})`: ''}`}
                    >
                        {sidelinedInfo.category === 'suspended' ? (
                            <div className="w-2 h-2.5 bg-red-600 rounded-sm"/>
                        ) : (
                            <span className="text-red-600 text-[10px] font-bold leading-none"></span>
                        )}
                    </div>
                )}
            </div>
            {showName && (
                <div className="flex flex-col items-center gap-1 mt-0.5">
                    <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                        {player.display_name.split(' ').pop()}
                    </p>
                    <span className={`text-xs px-1 rounded font-medium border ${eligible ? getPositionColor(player.position_id) : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                        {eligible ? (positionLabel ?? getPositionShort(player.position_id)) : 'NA'}
                    </span>
                    {points !== undefined && (
                        <span className="text-xs font-medium bg-gray-800 text-white px-1.5 py0.5 rounded-md">
                            {points}pts
                        </span>
                    )}
                    {outOfPosition && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center" style={{ fontSize: '8px' }}>
                            !
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}