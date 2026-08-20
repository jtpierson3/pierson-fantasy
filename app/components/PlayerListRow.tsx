import Image from 'next/image'
import { getPositionShort, getPositionColor } from '@/lib/helpers'
import { isPremierLeagueEligible } from '@/lib/playerEligibility'
import type { DisplayPlayer, DisplayTeam } from '@/lib/playerTypes'

type SidelinedInfo = {
    category: string
    typeName: string
    endDate: string | null
}

type Props = {
    player: DisplayPlayer
    team?: DisplayTeam | null
    size?: 'sm' | 'md'
    isIR?: boolean
    onIRToggle?: () => void
    irSpotsAvailable?: boolean
    showPoints?: boolean
    points?: number
    sidelinedInfo?: SidelinedInfo | null
}

export default function PlayerListRow({
    player,
    team,
    size = 'md',
    isIR = false,
    onIRToggle,
    irSpotsAvailable = true,
    showPoints = true,
    points,
    sidelinedInfo,
}: Props) {
    const isCompact = size == 'sm'
    const eligible = isPremierLeagueEligible(team?.leagueId)

    return (
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
            isIR ? 'bg-red-50 hover:bg-red-100'
            : !eligible ? 'bg-red-50 hover:bg-red-100'
            : 'hover:bg-gray-50' 
        }`}>
            {/* Jersey Number */}
            <div className="w-6 text-xs text-gray-400 text-center flex-shrink-0">
                {player.jersey_number ?? '-'}
            </div>

            {/* Player Image */}
            <div className="relative w-8 h-8 flex-shrink-0">
                <Image 
                    src={player.image_path}
                    alt={player.display_name}
                    fill
                    sizes="32px"
                    className="object-contain rounded-full"
                />
                {sidelinedInfo && (
                    <div
                        className="absolute -bottom-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-sm cursor-help"
                        title={`${sidelinedInfo.typeName}${sidelinedInfo.endDate ? ` (until ${new Date(sidelinedInfo.endDate).toLocaleDateString()})` : ''}`}
                    >
                        {sidelinedInfo.category === 'suspended' ? (
                            <div className="w-2 h-2.5 bg-red-600 rounded-sm" />
                        ) : (
                            <span className="text-red-600 text-xs font-bold leading-none">+</span>
                        )}
                    </div>
                )}
            </div>

            {/* Name and Team */}

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isIR ? ' text-red-700' : 'text-gray-900'}`}>
                    {player.display_name}
                </p>

                {/* sm stacked layout - badge and position underneath name */}
                {isCompact ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                       {team && (
                            <>
                                <div className="relative w-3.5 h-3.5 flex-shrink-0">
                                    <Image 
                                        src={team.image_path}
                                        alt={team.name}
                                        fill
                                        sizes="32px"
                                        className="object-contain"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 truncate">{team.name}</p>
                                <span className="text-gray-300">-</span>
                            </>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border ${
                            isIR ? 'bg-red-100 text-red-600 border-red-200' 
                            : !eligible ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : getPositionColor(player.position_id)
                        }`}>
                            {isIR ? 'IR' : !eligible ? 'NA' :  getPositionShort(player.position_id)}
                        </span>
                    </div>
                ) : (
                    /* md: team name on second line, position separate */
                    team && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className="relative w-3.5 h-3.5 flex-shrink-0">
                                <Image 
                                    src={team.image_path}
                                    alt={team.name}
                                    fill
                                    sizes="32px"
                                    className="object-contain"
                                />
                            </div>
                            <p className="text-xs text-gray-400 truncate">{team.name}</p>
                        </div>
                    )
                )}
            </div>

            {/* POSITION BADGE */}
            {!isCompact ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                    isIR ? 'bg-red-100 text-red-600 border-red-200' 
                    : !eligible ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : getPositionColor(player.position_id)
                }`}>
                    { isIR? 'IR' : !eligible ? 'NA' : getPositionShort(player.position_id)}
                </span>
            ) : (
                <></>
            )}
            
            {/* Points */}
            {showPoints && points !== undefined && (
                <span className="text-sm font-medium text-gray-900 flex-shrink-0 w-12 text-right">
                    {points ?? '0'}
                </span>
            )}
            

            {/* IR Toggle Button */}
            {onIRToggle && (
                <button
                    onClick={onIRToggle}
                    disabled={!isIR && (!irSpotsAvailable || !eligible)}
                    title={!eligible ? 'This player is not yet eligible for IR' : undefined}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${
                        isIR
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : irSpotsAvailable && eligible
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {isIR ? 'Remove IR' : 'Add IR'}
                </button>
            )}
        </div>
    )
}