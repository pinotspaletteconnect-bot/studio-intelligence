const MARKETING_PLACEHOLDER_PREFIX = /^\s*available\s+for\b/i

export function isMarketingPlaceholderClass(painting: string | null | undefined) {
  return MARKETING_PLACEHOLDER_PREFIX.test(painting ?? "")
}

export function isPrivateOrMobileClassType(classType: string | null | undefined) {
  return classType === "Private Party" || classType === "Mobile Events"
}
