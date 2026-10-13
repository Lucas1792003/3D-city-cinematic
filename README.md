# 3D City cinematic — reference copy

Copied 2026-10-13 from `work/cyfro-landing-page` (branch `redesign/3d-city`, commit `002b7a2`).
A snapshot: the originals are untouched and remain the source of truth.

## Run it

```bash
npm run dev        # http://localhost:3100
```

- `/` shows only the two cinematic sections: "Why Traditional Security Platforms Fall Behind", then
  Platform Architecture with its "Explore the Full 3D City" button.
- `/platform-city/` is the 3D City, with Back to home.
- The app includes everything those pages import, copied from the landing repo: the whole city, i18n,
  header, styles and two logo images. It also has its own `package.json`, `next.config.ts`, a trimmed
  `app/layout.tsx` and `app/page.tsx`.
- `node_modules` is an APFS clone of the landing repo's, so no install was needed.
- There is no site nav bar or announcement banner: both were removed from `app/page.tsx` and
  `app/platform-city/page.tsx`.
- `City.module.css` no longer reserves room for the nav: `.pageSection` top padding went from 104px to 16px,
  and the `.pageStage` height formula from `100svh - 226px` to `100svh - 149px`.

### "? — Coming Soon" platform

The city's built-in teaser mechanism is switched on with one entry in
`app/components/landing/sections/cyfro-city/registry/teasers.ts`:
`reserved-01` at grid (5, 2), in the south-east corner beside "Your team".
- It uses the existing `mystery` builder: a black pad, glowing edges, an empty build frame and a floating "?".
- It arrives last in the assembly, about 67 s in, as slot 17 of 17. It has no connections and no activity.
- It appears in the label, the Platforms list, the side panel and the intro caption.
- Its text ("? — Coming Soon" / "A new CyfroSec capability will appear here.") is kept real in
  placeholder mode, and so is the "?" sign.
- To remove it, set `TEASERS` back to `[]`. More teasers can use the free cell (5, 0).

### Placeholder text mode (on by default)

`app/Dashify.tsx` replaces every visible character with `-` and keeps the spaces. This covers page text,
SVG text and canvas text, including the 3D screens and labels.
- Single lines get extra letter spacing, so each keeps the width of the real text.
- Page and section heights are identical to the real copy (measured: 10,641 px both).
- Add `?realText` to any URL to see the original copy.
- To turn it off for good, remove `<Dashify />` from `app/layout.tsx`.
- The logo is replaced with a "?":
  - `public/circle_logo.png` is now a blue "?" at the same 236×233 size, used by the Engine orb, the Engine
    panel and the owl.
  - The original is kept as `public/circle_logo.original.png`; copy it back to undo.
  - `public/logo.png` (the wordmark) was only used by the removed navbar.
- These controls keep their real text (`KEEP` and `KEEP_TEXT` in `Dashify.tsx`):
  - the view tabs;
  - zoom −/+ and Reset view, plus Platforms, Labels and Overview in the city;
  - Skip intro / Replay intro and Pause motion;
  - the "Drag to rotate…" hint;
  - the "Explore the Full 3D City" button and the note under it;
  - the city title row: Back to home, the heading and the description. The heading is now just "3D City"
    (the word "CyfroSec" was removed in `CityCinematic.tsx`). The badge next to the description stays dashed.

## The three cinematics

1. **Homepage → city (outro, 3.4 s)**: `platform-architecture-3d/CinematicScene.tsx` (`startOutro`)
   - The camera glides to the handoff shot, and the Sources and Outputs zones slide out and sink.
   - The deck contracts to the Engine.
   - The stage FLIPs to the city stage rect (`ArchitectureCinematic.tsx`).
   - A JPEG of the last frame is held as a veil on `/platform-city`.
   - The trigger is the CTA in `PlatformArchitectureDetail.tsx`.
2. **City opening, with a staged Engine-details reveal (about 0.5–3.5 s)**:
   - `cyfro-city/engine/createCity.ts` runs the opening.
   - `cyfro-city/chunks/engineSurrounds*.ts` hold the reveal stages (`REVEAL`, `revealAt`).
3. **City → home (return, 4.8 s)**:
   - `createCity.ts` `leaveCity` retracts the city groups into the Engine, then captures the frame.
   - The browser goes to `/#architecture-detail`.
   - The homepage runs `entry: 'return'` (`restoreWorld`), a short reassembly instead of the full intro.

## Also: the "Why Traditional Security Platforms Fall Behind" section

- `sections/ProblemStatement.tsx` is the section shell.
- `sections/problem-cinematic/` is the scroll-driven story:
  - `CinematicStory.tsx` and `timeline.ts` drive it;
  - `WorldArt.tsx` and `worldData.ts` draw the illustrated world;
  - `OwlActor.tsx` places the owl;
  - `Art.module.css` styles it.
- `components/landing/owl/` is the shared owl component the section uses.

## Shared contract

- `cityHandoff.ts` holds the shared values:
  - the `HANDOFF` camera (Engine-relative target, azimuth 14.5°, elevation 31.7°, distance 7.23, fov 34/50);
  - the sessionStorage record (20 s validity);
  - the stage-rect memory and `centredScrollTop`.
- `orbit.ts`: the same camera model in both scenes.
- `LandingHeader.tsx`: the nav "top" event during the outro.
- `tests/city-handoff.test.cjs`: keeps both scenes' numbers in sync.
- `docs/design/3d-city/10-implementation-log.md`: the full pass-by-pass log, passes 19–28.
