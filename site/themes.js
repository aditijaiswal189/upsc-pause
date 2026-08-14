// Themes — the same room at different hours.
//
// Adding one is: generate two images (landscape + portrait), drop them in
// assets/, add an entry below. Nothing else. A theme whose artwork is missing
// simply doesn't appear in the picker, so you can add them one at a time.
//
// Art prompts for each are in ART.md.
//
// `scrim` tunes how hard the page darkens the photo behind the text. The night
// room is already dark and needs very little; a bright daylight photo needs a
// lot or the white title becomes unreadable. Getting this wrong is the single
// most likely way a new theme looks broken.

// ⚠ `ready` MUST be flipped to true only once BOTH images exist in assets/.
//    It also has to match the HAVE array in the inline script in index.html —
//    that script runs before any module loads and cannot import this file, so
//    the list is deliberately duplicated in exactly one other place. Both are a
//    one-word change; leaving them out of sync means someone visiting at the
//    wrong hour gets a blank room, which is how this was caught.
export const THEMES = [
  {
    // Ordered as the day runs: park, library, night. The park photograph is
    // unmistakably dawn — low sun just over the skyline, long shadows — so it
    // gets the early slot. Showing it at 3pm reads as wrong immediately, in a
    // way that a warm interior at 3pm does not.
    id: 'bahar',
    label: 'बाहर',
    place: 'पार्क',
    hours: [5, 6, 7, 8, 9],
    landscape: 'bahar',
    portrait: 'bahar-portrait',
    scrim: 'bright',
    ready: true
  },
  {
    // The library in daylight. Called दिन rather than सुबह because it holds the
    // whole middle of the day — a label saying "morning" while the clock reads
    // 4pm is a small lie the page does not need to tell.
    id: 'din',
    label: 'दिन',
    place: 'लाइब्रेरी',
    hours: [10, 11, 12, 13, 14, 15, 16, 17, 18],
    landscape: 'din',
    portrait: 'din-portrait',
    scrim: 'bright',
    ready: true
  },
  {
    id: 'raat',
    label: 'रात',
    place: 'लाइब्रेरी',
    hours: [19, 20, 21, 22, 23, 0, 1, 2, 3, 4],
    landscape: 'room',
    portrait: 'room-portrait',
    scrim: 'dark',
    ready: true
  }
];

export const READY = THEMES.filter((t) => t.ready);

// Which theme the local clock implies. The clock is already in the corner, so
// the room matching the actual hour is the detail that makes it feel like a
// place rather than a wallpaper.
// Only ever returns a theme whose artwork exists — otherwise the hour decides
// to show a room that isn't there.
export function themeForNow(date = new Date()) {
  const h = date.getHours();
  return READY.find((t) => t.hours.includes(h)) || READY[0] || THEMES[0];
}
