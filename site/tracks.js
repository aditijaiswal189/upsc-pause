// The playlist.
//
// Every id here should be a track you have actually listened to all the way
// through. Never paste an id you haven't played — it points the page at
// whatever happens to live at that address, and this is a site for people
// having a hard year.
//
// ── HOW TO ADD A SONG ────────────────────────────────────────────────────────
//
// 1. Find the video on YouTube and copy its URL.
//
//      https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s
//                                     └─────┬─────┘
//                                     this is the id
//
//    Short links work the same way — in https://youtu.be/dQw4w9WgXcQ the id is
//    the bit after the slash. Ignore everything after `&`.
//
// 2. Add an entry to TRACKS below:
//
//      { id: 'dQw4w9WgXcQ', title: 'राग यमन — बाँसुरी', artist: 'Hariprasad Chaurasia' }
//
//    `title` and `artist` are yours to write; they are what the player shows.
//    Cover art is fetched automatically from the video thumbnail.
//
// 3. Save and reload the page. That's it — no build step.
//
// ⚠ CHECK IT IS EMBEDDABLE FIRST. Plenty of music videos have embedding
//   disabled by the rights holder, and those will not play here. Test by opening
//   this URL directly, with your id:
//
//      https://www.youtube.com/embed/dQw4w9WgXcQ
//
//   If it plays there, it works here. If it says "Video unavailable", pick a
//   different upload of the same track. The player skips a failed track
//   automatically, but a playlist half full of them just sounds broken.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// What belongs here: songs that make you want to sit back down. Anthems,
// build-ups, film scores an aspirant already associates with pushing through.
// Mixing in a few slower ones (Kun Faya Kun, the flute cover, Kachha Ghada)
// keeps it from being relentless — a playlist that only shouts stops working
// after twenty minutes.
//
// A licensing note. Playing these through an embedded YouTube player is how
// saloon.wtf does it and it avoids licensing the audio yourself — but hiding
// the player for audio-only playback sits against YouTube's Terms of Service.
// It is widely done and rarely enforced; the exposure grows with the traffic.
// If this gets big, move to licensed or commissioned audio. The room ambience
// in `ambience.js` is yours outright and carries no such risk.

// NOTE ON THE `?si=` PART. A share link looks like
//     https://youtu.be/c2f03oSSDAM?si=uhYpyfy7bjzqVulZ
// The id is ONLY `c2f03oSSDAM`. The `?si=…` is a share-tracking parameter and
// must be stripped — left on, YouTube treats the whole string as the id and the
// track silently fails to load.
//
// TONE — decided. This playlist is motivational, and that is deliberate: it is
// what this audience actually reaches for. The copy in LINES below was rewritten
// to match, so the page no longer says "no hurry" over an anthem.
//
// The register is *endurance and company*, not rest and not coaching hype:
// you're not alone, it's a long race, you turned up again today. That sits
// under an anthem without either fighting it or turning into a motivational
// poster.

export const TRACKS = [
  { id: "c2f03oSSDAM", title: "UPSC Anthem", artist: "PW OnlyIAS" },
  {
    id: "LMfrk9E_oiU",
    title: "De Mauka Zindagi",
    artist: "TVF Aspirants · Nilotpal Bora",
  },
  { id: "x5fYTPvrz4g", title: "Manzar Hai Yeh Naya", artist: "Uri" },
  { id: "9iIX4PBplAY", title: "Kar Har Maidaan Fateh", artist: "Sanju" },
  { id: "sSsw7QPrUk0", title: "Lakshya", artist: "Shankar–Ehsaan–Loy" },
  { id: "DmsOinqrPvQ", title: "Badal Pe Paon Hain", artist: "Chak De! India" },
  { id: "Q3JMD4oaXlI", title: "Shaabaashiyaan", artist: "Mission Mangal" },
  { id: "V0ejQDKE4w8", title: "Let's Crack It", artist: "Naezy · Dub Sharma" },
  { id: "-LWbeZUyQe8", title: "Kachha Ghada", artist: "Rahgir" },
  {
    id: "0Rm2cajspwY",
    title: "Sapne Re",
    artist: "Secret Superstar · Amit Trivedi",
  },
  { id: "gg1tN-gkcwk", title: "Aarambh", artist: "Piyush Mishra · Gulaal" },
  { id: "50q8wD6MXgI", title: "Bismil", artist: "Sukhwinder Singh · Haider" },
  { id: "BKx_B1VZ2kw", title: "Ae Watan", artist: "Raazi · Sunidhi Chauhan" },
  { id: "Ax0G_P2dSBw", title: "Zinda", artist: "Bhaag Milkha Bhaag" },
  {
    id: "pxcRWdGKSko",
    title: "Kyun Main Jaagoon",
    artist: "Patiala House · unplugged",
  },
  {
    id: "wpx8xCC7ETM",
    title: "See You Again",
    artist: "Swarnim Maharjan · flute",
  },
  {
    id: "T94PHkuydcw",
    title: "Kun Faya Kun",
    artist: "Rockstar · A.R. Rahman",
  },
  { id: "cF2yqyiJACk", title: "Soorma Anthem", artist: "Shankar Mahadevan" },
  { id: "M7ub-Fg92Zk", title: "Thaan Liya", artist: "Dasvi · Sachin–Jigar" },
];

// Where the "listen properly" link points once you have a real playlist.
export const PLAYLIST_LINKS = {
  ytMusic: "", // e.g. https://music.youtube.com/playlist?list=...
  spotify: "",
};

// The lines that rotate under the title.
//
// Register: endurance and company. Not rest ("कोई जल्दी नहीं है" fights an
// anthem), and not coaching ("तू कर लेगा" is what every other site already
// says). These are what the person at the next desk would say — someone in it
// with you, not someone shouting at you from outside it.
//
// Still true regardless: never instruct, never count down to the exam, never
// promise an outcome.
export const LINES = [
  "अकेले नहीं हो।", // you're not alone
  "यहाँ सब उसी में लगे हैं।", // everyone here is at the same thing
  "रोज़ थोड़ा-थोड़ा।", // a little every day
  "लंबी दौड़ है।", // it's a long race
  "आज भी आए — यही बहुत है।", // you turned up today too; that's plenty
  "कल फिर बैठेंगे।", // we'll sit again tomorrow
  "साँस ले। फिर पढ़ लेना।", // breathe. then study
  "चाय ठंडी हो रही है।", // your chai is going cold
];

// Presence counter — "N साथ में" in the top bar.
//
// Empty until you deploy the server, and the UI stays hidden while it is empty.
// Showing an invented number to people who are lonely would be the worst thing
// this page could do, so there is no fallback and no fake.
//
// The server is in server/presence-worker.js. To turn it on:
//
//   cd presence-server
//   npx wrangler deploy
//
// Wrangler prints a URL like https://sankalp-presence.<you>.workers.dev — paste
// it below and reload. That's the whole setup.
export const PRESENCE_ENDPOINT = "";
