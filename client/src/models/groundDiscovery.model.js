// Phase 13 — pure logic/constants for ground discovery, kept separate from
// the fetching hooks (useGroundsByCity.js/useGround.js) so it's testable
// with the project's one existing test convention (node --test, no DOM).
//
// Post-report revision: location is city-based (CitySearch.jsx), not
// GPS/lat-lng — the radius/coordinate-validation/distance-formatting
// helpers this file used to export (RADIUS_OPTIONS_KM, isValidLatitude,
// isValidLongitude, formatDistance, widerRadiusOptions) were removed along
// with the components that used them (LocationPicker/RadiusFilter),
// rather than left as dead exports. The backend's distance-based
// GET /grounds/nearby endpoint itself is untouched and still works — only
// the frontend's use of it was removed.

export const DEFAULT_PAGE_SIZE = 20

// A ground's public contact fields are all optional (Phase 12 — a ground
// row can have null phone/email/website). Step 20 requires hiding missing
// fields rather than rendering a placeholder, so callers check this instead
// of relying on falsy-string coercion sprinkled through JSX.
export function hasValue(field) {
  return field !== null && field !== undefined && String(field).trim() !== ''
}

// Ground contact address — joins only the parts that exist, so a ground
// missing postalCode (say) doesn't render a dangling ", ,". Used by
// GroundContact/GroundAbout's map embed query.
export function formatGroundAddress(ground) {
  if (!ground) return ''
  return [ground.addressLine, ground.city, ground.state, ground.postalCode, ground.country]
    .filter(hasValue)
    .join(', ')
}
