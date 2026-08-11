const MARKETING_PLACEHOLDER_PREFIX = /^\s*(?:available\s+for\b|coming\s+soon\s*$)/i

export function isMarketingPlaceholderClass(painting: string | null | undefined) {
  return MARKETING_PLACEHOLDER_PREFIX.test(painting ?? "")
}

export function isPrivateOrMobileClassType(classType: string | null | undefined) {
  return classType === "Private Party" || classType === "Mobile Events"
}

export function isZeroActivityPartyEvent({
  classType,
  painting,
  seatsSold,
  classSales,
  feeSales,
}: {
  classType: string | null | undefined
  painting: string | null | undefined
  seatsSold: unknown
  classSales: unknown
  feeSales: unknown
}) {
  if (!isPrivateOrMobileClassType(classType)) return false
  const hasSelectedPainting = Boolean(
    painting?.trim() &&
    !/^no\s+painting\s+selected$/i.test(painting.trim()) &&
    !isMarketingPlaceholderClass(painting)
  )
  if (hasSelectedPainting) return false
  const numeric = (value: unknown) => {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return (
    numeric(seatsSold) === 0 &&
    numeric(classSales) === 0 &&
    numeric(feeSales) === 0
  )
}
