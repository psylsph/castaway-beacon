// The sandbar is an ellipse centred on the island art (240, 356), radii ~138x63.
// Walkable area shrinks it by a margin so the survivor's feet stay on sand.

export const SAND_CENTER = { x: 240, y: 356 } as const
export const SAND_RADIUS_X = 138
export const SAND_RADIUS_Y = 63

/** Fraction of the sand radius the actor centre must stay inside. */
export const WALK_LIMIT = 0.82

/** Where raft platforms get placed (clamped onto sand when used). */
export const BUILD_ORIGIN = { x: 150, y: 366 } as const

export function isWalkable(x: number, y: number): boolean {
  const dx = (x - SAND_CENTER.x) / (SAND_RADIUS_X * WALK_LIMIT)
  const dy = (y - SAND_CENTER.y) / (SAND_RADIUS_Y * WALK_LIMIT)
  return dx * dx + dy * dy <= 1
}

export function clampToSand(x: number, y: number): { x: number; y: number } {
  if (isWalkable(x, y)) return { x, y }

  const dx = x - SAND_CENTER.x
  const dy = y - SAND_CENTER.y
  const rx = SAND_RADIUS_X * WALK_LIMIT
  const ry = SAND_RADIUS_Y * WALK_LIMIT

  if (dx === 0 && dy === 0) return { x: SAND_CENTER.x, y: SAND_CENTER.y }

  // Project onto the ellipse boundary along the ray from the centre.
  const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry))
  return { x: SAND_CENTER.x + dx * t, y: SAND_CENTER.y + dy * t }
}
