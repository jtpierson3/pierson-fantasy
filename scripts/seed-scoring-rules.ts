async function setSeedingRules() {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })

  const { prisma } = await import('@/lib/prisma')

  const positions = ['ST', 'WM', 'DEF', 'GK'] as const

  type FlatRule = {
    statKey: string
    displayName: string
    statTypeId: number | null
    points: Record<typeof positions[number], number>
  }

  const flatRules: FlatRule[] = [
    { statKey: 'GOAL', displayName: 'Goal', statTypeId: 52, points: { ST: 9, WM: 9, DEF: 10, GK: 10 } },
    { statKey: 'ASSIST', displayName: 'Assist', statTypeId: 79, points: { ST: 6, WM: 6, DEF: 7, GK: 7 } },
    { statKey: 'KEY_PASS', displayName: 'Key Pass', statTypeId: 117, points: { ST: 2, WM: 2, DEF: 2, GK: 2 } },
    { statKey: 'SHOT_ON_TARGET', displayName: 'Shot on Target', statTypeId: 86, points: { ST: 2, WM: 2, DEF: 2, GK: 2 } },
    { statKey: 'ACCURATE_CROSS', displayName: 'Accurate Cross', statTypeId: 99, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'SUCCESSFUL_DRIBBLE', displayName: 'Successful Dribble', statTypeId: 109, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'TACKLE_WON', displayName: 'Tackle Won', statTypeId: 27267, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'INTERCEPTION', displayName: 'Interception', statTypeId: 100, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'AERIAL_WON', displayName: 'Aerial Won', statTypeId: 107, points: { ST: 0.5, WM: 0.5, DEF: 1, GK: 1 } },
    { statKey: 'EFFECTIVE_CLEARANCE', displayName: 'Effective Clearance', statTypeId: 101, points: { ST: 0.25, WM: 0.25, DEF: 0.25, GK: 0.25 } },
    { statKey: 'DISPOSSESSED', displayName: 'Dispossessed', statTypeId: 94, points: { ST: -0.5, WM: -0.5, DEF: -0.5, GK: -0.5 } },
    { statKey: 'PK_MISSED', displayName: 'Penalty Missed', statTypeId: 112, points: { ST: -4, WM: -4, DEF: -4, GK: -4 } },
    { statKey: 'PK_EARNED', displayName: 'Penalty Earned', statTypeId: 115, points: { ST: 2, WM: 2, DEF: 2, GK: 2 } },
    { statKey: 'PK_CONCEDED', displayName: 'Penalty Conceded', statTypeId: 114, points: { ST: -2, WM: -2, DEF: -2, GK: -2 } },
    { statKey: 'OWN_GOAL', displayName: 'Own Goal', statTypeId: 324, points: { ST: -5, WM: -5, DEF: -5, GK: -5 } },
    { statKey: 'YELLOW_CARD', displayName: 'Yellow Card', statTypeId: 84, points: { ST: -3, WM: -3, DEF: -3, GK: -3 } },
    { statKey: 'RED_CARD', displayName: 'Red Card', statTypeId: 83, points: { ST: -7, WM: -7, DEF: -7, GK: -7 } },
    { statKey: 'CLEAN_SHEET', displayName: 'Clean Sheet', statTypeId: null, points: { ST: 0, WM: 2, DEF: 6, GK: 8 } },
    { statKey: 'GOAL_CONCEDED', displayName: 'Goal Conceded', statTypeId: 88, points: { ST: 0, WM: -1, DEF: -2, GK: -2 } },
    { statKey: 'SAVE', displayName: 'Save', statTypeId: 57, points: { ST: 0, WM: 0, DEF: 0, GK: 1 } },
    { statKey: 'PK_SAVED', displayName: 'Penalty Saved', statTypeId: 113, points: { ST: 0, WM: 0, DEF: 0, GK: 8 } },
    { statKey: 'MOTM', displayName: 'Man of the Match', statTypeId: 1490, points: { ST: 5, WM: 5, DEF: 5, GK: 5 } },
    { statKey: 'ERROR_LEAD_TO_GOAL', displayName: 'Error Leading to Goal', statTypeId: 571, points: { ST: -5, WM: -5, DEF: -5, GK: -5 } },
    { statKey: 'SHOT_OFF_POST', displayName: 'Shot Off Post', statTypeId: 64, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'TOUCH', displayName: 'Touch', statTypeId: 120, points: { ST: 0.05, WM: 0.05, DEF: 0.05, GK: 0.05 } },
    { statKey: 'FOULED', displayName: 'Fouled', statTypeId: 96, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'OFFSIDE', displayName: 'Offside', statTypeId: 51, points: { ST: -0.5, WM: -0.5, DEF: -0.5, GK: -0.5 } },
    { statKey: 'BLOCKED_SHOT', displayName: 'Blocked Shot', statTypeId: 97, points: { ST: 0.5, WM: 0.5, DEF: 0.5, GK: 0.5 } },
    { statKey: 'CROSS', displayName: 'Cross', statTypeId: 98, points: { ST: 0.25, WM: 0.25, DEF: 0.25, GK: 0.25 } },
    { statKey: 'ACCURATE_LONG_BALL', displayName: 'Accurate Long Ball', statTypeId: 123, points: { ST: 0.5, WM: 0.5, DEF: 0.5, GK: 0.5 } },
    { statKey: 'ACCURATE_THROUGH_BALL', displayName: 'Accurate Through Ball', statTypeId: 125, points: { ST: 1, WM: 1, DEF: 1, GK: 1 } },
    { statKey: 'SHOT_TAKEN', displayName: 'Shot Taken', statTypeId: 42, points: { ST: 0.25, WM: 0.25, DEF: 0.25, GK: 0.25 } },
  ]

  for (const rule of flatRules) {
    for (const position of positions) {
      await prisma.scoringRule.upsert({
        where: { statKey_position: { statKey: rule.statKey, position } },
        update: {
          displayName: rule.displayName,
          statTypeId: rule.statTypeId,
          pointsPerUnit: rule.points[position],
          isGraduated: false,
        },
        create: {
          statKey: rule.statKey,
          displayName: rule.displayName,
          statTypeId: rule.statTypeId,
          position,
          pointsPerUnit: rule.points[position],
          isGraduated: false,
        }
      })
    }
  }

  // Graduated rule — Passing Accuracy, same tiers for every position
  const passingAccuracyTiers = [
    { min: 90, points: 3 },
    { min: 80, points: 2 },
    { min: 70, points: 1 },
    { min: 0, points: 0 },
  ]

  for (const position of positions) {
    await prisma.scoringRule.upsert({
      where: { statKey_position: { statKey: 'PASSING_ACCURACY', position } },
      update: {
        displayName: 'Passing Accuracy',
        statTypeId: 1584,
        isGraduated: true,
        tiers: passingAccuracyTiers,
        pointsPerUnit: null,
      },
      create: {
        statKey: 'PASSING_ACCURACY',
        displayName: 'Passing Accuracy',
        statTypeId: 1584,
        position,
        isGraduated: true,
        tiers: passingAccuracyTiers,
      }
    })
  }

  console.log('Scoring rules seeded successfully.')
}

setSeedingRules()