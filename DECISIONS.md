# Over/Under: the questions we asked, and our answers

**The brief:** An offline mini Viral Markets for an iPad at in-person events. Staff preload videos and their real view counts. Players swipe each video over or under a view line. Get all 5 right and you win money. Miss one and you get egged 😈. It needs a results screen, a home screen that lists your games with a way to create new ones, and a small back arrow. It should look like viralmarkets.com and be hosted on Vercel.

Live at **https://vm-over-under.vercel.app**. The Vercel project is `vm-over-under`, under the scope "Eric Zhu's projects".

## Product

| Question | Answer |
|---|---|
| The brief says "offline" and also "accessible online". Which is it? | **Both.** It's hosted on Vercel and can be installed to the iPad's Home Screen. After the first open it runs with no wifi: a service worker caches the app, and the videos are stored on the iPad. |
| How many videos per game? | **Any number.** Five is recommended. A player wins only with a perfect score. |
| What exactly is the "line"? | For each video, staff enter a line and the real view count. **OVER is correct when real views ≥ line.** A tie counts as OVER ("did it reach 250K?"), which matches VM's "Will this reach X views?". The 🎲 button suggests a line from the real views. It picks randomly above or below, so the answers stay mixed. |
| When do players find out if they were right? | **At the end, like a quiz.** The results screen reveals each video one at a time and counts up to the real views. This keeps all 5 swipes tense instead of the game being over after the first miss. |
| Which way is Tinder-style swiping? | **Right = OVER (green) and left = UNDER (red).** The buttons sit on the matching sides: under the card in portrait, and on either side of the card in landscape. |
| "We give them money": what does the app do? | Each game has a prize text field (default **$20**). It shows on the intro and on the win screen. The win screen shows **"Winner #N · time"** so staff can verify and track payouts. The home screen counts plays and winners per game. The actual payout is handled by staff. |
| "Egg them"? | The app throws an egg at the screen. It splats and drips, "EGGED" stamps on top, and a roast line appears based on how close the player got. The real-life egg is up to you. |
| Sound? | **On** after "Tap to start", with a mute toggle. The sound effects are synthesized, so there are no audio files. |
| Can a player tap the back arrow and open the editor to see the answers? | Only if you allow it. The lock icon sets an optional **staff PIN** that locks create/edit/delete/import. It **re-locks every time a game starts.** |
| Should the cards show likes, comments or the current views like VM does? | **No.** They give away the answer. Cards show only the handle, platform, caption and the line. |
| How do players leave a game? | A small translucent back arrow in the top-left. It never covers the video. |

## Design

- **Branding taken from viralmarkets.com:** background `#0A0A0F`, primary purple `#8257F5`, VM's Yes/No green `#22C55E` and red `#EF4444` with the darker 3D bottom edge, the Inter font, the "Vm" logo with its handwriting reveal animation (same stroke path as VM's splash), the "Viral Markets" wordmark, and VM's app icons.
- **iPad-first, in both orientations.** Portrait puts the buttons under the card. Landscape puts UNDER on the left and OVER on the right. The card is always exactly 9:16. Landscape videos are letterboxed over a blurred poster.
- After the game there's a promo panel with a QR code to viralmarkets.com, because this is a promo event.

## Engineering

- **Stack:** Vite, React 19, TypeScript, framer-motion (swipe physics), vite-plugin-pwa/Workbox (offline), idb-keyval (IndexedDB), canvas-confetti. There is **no backend.**
- **Videos live in the iPad's IndexedDB.** Playback is instant, there's no upload wait, and it works offline. The tradeoff is that a game only exists on the device where it was made. **Export/Import** (`.vmgame` file, sent by AirDrop or Files) copies a game to another iPad and doubles as a backup.
- **iOS gotchas handled:**
  - The swipe is decided on the native `pointerup` event. framer's `onDragEnd` fires a frame later, outside the gesture, and iOS would then block the next video from playing with sound.
  - If sound is blocked, the video plays muted and shows a "Tap for sound" chip.
  - `playsinline` is set on videos.
  - Wake lock keeps the screen on.
  - Inputs are ≥16px so iPadOS doesn't zoom into them.
  - Pinch-zoom is blocked.
  - Videos that won't play from IndexedDB fall back to a copy held in memory.
  - `.mov` files are relabeled so they also play in desktop Chrome.
- **An app update never reloads mid-game.** A new version waits and is applied the next time you land on the home screen.
- **The sample game** uses generated placeholder clips (fractals, Game of Life, gradients). It contains no third-party content, so the link is playable right away. Its lines and views are made up.
- **Tests:** `npm test` covers view parsing and formatting, scoring and ties, playability checks, and a byte-exact export → import round trip.

## Event-day checklist

1. On the iPad, open **https://vm-over-under.vercel.app** in Safari. Tap **Share → Add to Home Screen**.
2. **Open the Home Screen app once while you're online**, and create your games *inside it*. iPadOS keeps Safari's storage separate from Home Screen apps. You can also move games between them with Export/Import.
3. Tap **New game → Add videos** (from Photos or Files). Fill in the creator, **line**, and **real views**. Check the "Correct call" column.
4. Tap the **lock icon** and set a staff PIN.
5. Optional: turn on Guided Access (Settings → Accessibility) to pin the app on screen. Keep the iPad charging and the volume up.
6. Tap **Play** and hand the iPad over. After each player, tap **Next player**.

## Known limitations

- Games don't sync between devices automatically. Use Export/Import.
- Clearing Safari website data deletes the games. Export a backup first.
- You can't paste TikTok or Instagram links. Embeds show the view count and need wifi. Download the videos instead, preferably clean copies with no visible like or view counts.
