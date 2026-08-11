// Phase 13 — platform-wide highlight stats, shown on the LOC platform
// homepage (DiscoveryPage), not any individual ground's page. These used to
// live in the old single-ground About section, but "Turf Pitches: 6" etc.
// described one specific ground's physical facilities — Phase 12 didn't add
// a backend field for per-ground stats, so presenting this unchanged on
// every future ground's page would be silently wrong the moment a second
// ground exists. Kept here, reworded implicitly by relocation, as generic
// platform copy instead of removed outright — same visual treatment
// (StatCounter), honest scope.
export const STATS = [
  { label: 'Years of Legacy', value: '15+' },
  { label: 'Grounds Powered', value: '1+' },
  { label: 'Matches Hosted', value: '500+' },
]
