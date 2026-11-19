# GULZA — Free Motion Subtitle Maker

**[Use the website](https://ruruoni1.github.io/gulza/en/)** · [Korean original](README.md) · [Original JIZURA](https://github.com/852wa/JIZURA)

**Other languages:** [한국어](README.md) · [日本語](README.ja.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md)

GULZA is a free browser tool that turns lyrics and subtitles into motion videos and saves them as MP4.

Its name is a short rendering of the Korean word “글자” (letters).

It builds on [JIZURA](https://github.com/852wa/JIZURA)'s 860 expression parts and 27 styles.

This fork imports SRT subtitle files directly, without converting them to LRC.

**Current version: v0.16.1** · Use the [website](https://ruruoni1.github.io/gulza/en/) without installing anything or creating an account. The root URL opens in Korean; switch the interface language at the top. · [Changelog](CHANGELOG.md)

## Features added in this fork

- **Direct SRT import:** Open a `.srt` file as it is and start editing a subtitle video. Sections without subtitles also appear in the video.
- **Korean subtitle file support:** Read SRT/LRC files in UTF-8, UTF-16, or Korean Windows encoding, up to 2 MB.
- **LRC export:** Save each subtitle's start time as LRC. To keep end times, save a project containing the SRT instead.
- **Interface languages:** Korean is the default; Japanese, English, Traditional and Simplified Chinese, Indonesian, and Vietnamese are available.
- **GULZA filenames:** With no title, exports use names such as `gulza.mp4` and `gulza.project.json`.

An SRT time marker appears in the lyrics field as `[SRT:00:00:01.000-->00:00:02.300]subtitle`.

Editing the marker changes the subtitle timing.

## Main features

- **Automatic arrangement:** Click once or press `R` to remake the style, mood, motion, palette, and cut arrangement. Changing the seed produces another video.
- **Timing editor:** Detect audio beats and align cuts, or tap during playback to set line and cut start times.
- **Export settings:** Choose 16:9, 9:16, 4:3, 3:4, 1:1, 4:5, or 21:9; 720p–4K; and 24/30/60 fps.
- **Video and images:** Export MP4, PNG sequences, transparent PNGs, or separate foreground/background PNGs. Green-screen and black backgrounds are available.
- **Project files:** Save and reopen a JSON project, or export arrangement JSON for After Effects.

| Repository file | Purpose |
|---|---|
| [`index.html`](index.html) | Default Korean GitHub Pages edition; other languages have `index.html` in their folders. |
| [`src/`](src/) · [`app/`](app/) | Motion engine, interface, translations, and build sources. |
| [`GULZA_AE.jsx`](GULZA_AE.jsx) | Korean After Effects ScriptUI panel. |
| [`GULZA_CEP.zip`](GULZA_CEP.zip) | Korean After Effects CEP panel. |
| [`ae/`](ae/) · [`cep/`](cep/) | After Effects panel sources and installation files. |
| [`docs/EXPRESSION_PACKS.md`](docs/EXPRESSION_PACKS.md) | Guide for developers adding expression parts. |

## Getting started

1. Open the [GULZA website](https://ruruoni1.github.io/gulza/en/).
2. Use **Import SRT / LRC** or enter one lyric phrase per line.
3. Import audio if you have it. You can also make a subtitle video without audio.
4. Choose **Create a variation** and check the preview. Use **Previous / Next** to revisit an arrangement.
5. Choose the aspect ratio, resolution, and frame rate, then **Export MP4**.

### Supported environment

MP4 export requires browser WebCodecs support. Chrome and Edge are recommended.

Available codecs depend on the browser and operating system. Preview and PNG sequence export remain available when MP4 export is unavailable.

You can edit on a phone; a computer is better for long or high-resolution exports.

Required fonts load from Google Fonts. When offline, installed fonts may be substituted.

## Automatic creation and fine adjustments

Switch between **Simple / Advanced** modes in the interface.

In Simple mode, **Create a variation** rerolls all of these:

- Style, background color, and display/body fonts.
- Mood: glitch, calm, pop, graphic, editorial, emotional, or mixed. Horror is included if horror effects are enabled.
- Motion strength, amount of glitch and decoration, and expression parts.
- Cut arrangement and seed.

Use **Previous / Next** to browse earlier variations.

**Change one thing** rerolls only the style, palette, mood, or arrangement while keeping the current result.

Automatic creation does not change lyrics, audio, timing, export settings, or locked lines.

### Expression sets used by automatic creation

Check boxes limit the parts considered for automatic creation, shuffle, and rerolling individual lines.

Parts you choose manually remain available regardless of these limits.

| Option | Initial state | Effect |
|---|---|---|
| Use extra effects | Off | Includes expressions, styles, and fonts added to the initial release of 356 parts and 12 styles. |
| Use Japanese-style effects | On | Includes lanterns, shoji, fans, cherry blossoms, and traditional patterns. |
| Use typography parts | On | Includes 50 parts based on lines, numbers, spacing, and text composition. |
| Use kinetic parts | On | Includes 51 parts where words move, stack, or cross. |
| Use horror effects | Off | Includes 52 horror parts, three related styles, and the horror mood. |

The parts list marks extra, Japanese-style, typography, kinetic, and horror parts.

Parts excluded from automatic selection under the current settings appear dimmed.

### Mobile layout

Choose **Mobile** mode for a narrow or touch screen.

The automatic creation button and preview stay visible while scrolling. Expand only the lines you need to edit.

Save, Open, and Reset are grouped in the menu. The initial export resolution in Mobile mode is 720p.

### Changing the palette

In **Advanced → Style → Accent / Offset colors**, choose **Random palette** to pick the two colors again.

Use a prepared combination or create one on the color wheel. Brightness is adjusted to keep text readable against the background.

You can also set colors manually. Clearing the override restores the style's default colors.

## Detailed browser editor guide

### Lyrics and subtitle notation

One lyric line is usually one phrase. A blank line adds a short pause.

| Example input | Meaning |
|---|---|
| `I remember/the colors of dawn` | Split the cut at `/`. |
| `*transparent*` | Emphasize the word. |
| `Last sentence!` | Add a flash and shake at the end. |
| `lyric\|small note` | Add small text for a note layout. |
| `[01:23.45]lyric` | Apply an LRC start time. |
| `[instrumental 8]` | Show only background and decorations for 8 seconds; 4 seconds if omitted. |
| `# note` | Treat the line as a working comment and omit it from the video. |

**Import SRT / LRC** replaces the current lyrics after a confirmation prompt.

You can restore the previous state with **Undo**.

SRT keeps both start and end times; LRC can store only start times.

### Audio and timing

- Import audio to detect BPM and beats and bring cut boundaries close to beats. The same browser may restore previously imported audio when you reopen the page.
- **Tap to sync:** Press `Space` as each line begins. Correct a mistake with `Backspace` or **Undo one**.
- **Restart partway through:** Use the sync button in the line list.
- **Tap aids:** Slow playback to 0.75× or 0.5×, or enable a count-in. Saved times use the song's original speed.
- **Cut timing:** Press `Tab` at a transition when a line has multiple cuts.
- Enter line start times numerically or drag boundaries on the timeline. You can zoom and seek there too.
- Undo lyric and timing edits with **Undo** or `Ctrl+Z`.

### Editing lines and cuts separately

Click the pencil in the line list or double-click a lyric to edit only that line.

Set its cut count to automatic or 1–6; use the dice to reroll that line.

Locking a line preserves its arrangement and palette. **Shuffle** rerolls the unlocked arrangement.

Choose a **Theme**—lyric video, kinetic, Japanese, horror, pop, or ballad—to narrow automatic creation.

In Advanced mode, change layout, entrance, hold, exit, decoration, text treatment, background, camera, and transitions for each cut.

Category and effect-value locks survive another automatic creation and are saved in the project file.

The **Loop** control cycles through whole video → line → cut → off. The selected range appears on the timeline.

### Styles, effects, and fonts

The 27 styles group colors, typefaces, and textures.

Examples include cherry blossom, deep sea, sunset, newspaper, paper, synth, and horror. A video may change its background between cuts.

Fonts load when needed. You can enter an installed font name or load a `.ttf`/`.otf` file.

**Advanced → Effects** adjusts motion, glitch, color offsets, decoration, cut density, texture, and frame holds.

Hiding decorative numbers and times does not remove numbers written in the lyrics.

**Advanced → Techniques** lets you turn parts on or off in ten categories. Search by name, select all, deselect all, or invert the selection.

**Consistency** uses similar layouts and motion for separated sections and repeated lyrics, with stronger effects on emphasized lines.

**Text alignment** adjusts type size, spacing, and decoration for legibility. Both options can be disabled.

**Keep center clear (for a character)** reserves space for another video in the middle.

Lyrics move to the sides in landscape and above/below or to the sides in portrait. The dotted preview guide is not exported.

### Export formats and ranges

| Format | Use |
|---|---|
| MP4 | Finished video; audio can be included. |
| PNG sequence ZIP | Frames for assembly in another editor. |
| Transparent PNG ZIP | Text and effects without a background. |
| Foreground/background PNG ZIP | Front and back elements of each frame in `front/` and `back/`. |
| LRC | Lyrics with each line's start time. |
| After Effects JSON | Current timing and arrangement for the GULZA AE panel. |

Choose the first and last lines under **Export range** to export only those lines. The filename gets a suffix such as `_L03-05`.

Chrome and Edge can write a large export directly to a selected file. If GPU encoding fails, another method is attempted.

A separate WAV may be saved when the browser cannot encode AAC audio.

**Clear lyrics** removes lyrics, per-line timing, choices, and export range; it can be undone.

**Reset** removes saved audio, settings, and edit history after confirmation and cannot be undone.

Project JSON files you downloaded separately are not removed.

### Frame rate and motion

Choose an output rate of 24, 30, or 60 fps. Frame count and the feel of motion are separate settings.

- **2-frame hold:** 12 movement steps per second for a choppier look.
- **3-frame hold:** 8 steps per second for a more paused look.
- **Full:** Movement on every output frame for the smoothest look.

60 fps and 4K take longer to export.

### Green screen, black background, and transparent PNG

To place lyrics over another video, choose green screen, black background, or a normal background under **Export → Background**.

Green screen uses `#00FF00`; black background uses `#000000`. Preview and export both reflect the choice.

Filenames get `_greenback` or `_blackback`.

Remove green with chroma key, or remove black with screen blending or a luminance key.

Transparent PNG needs no background removal. For split PNG ZIPs, layer `front/` over `back/`.

Flash and screen effects may apply to both layers, so check the composite.

### Lyrics language and fonts

**Lyrics language** defaults to auto-detect and examines Hangul, kana, Chinese characters, and Latin letters.

Choose Korean, Japanese, Traditional or Simplified Chinese, or English manually if needed. This setting does not change the interface language.

| Original style font family | Example Korean counterpart |
|---|---|
| Noto Sans JP · Zen Kaku Gothic New | Noto Sans KR |
| Noto Serif JP · Zen Old Mincho | Noto Serif KR |
| Dela Gothic One | Black Han Sans |
| M PLUS Rounded 1c | Jua |
| Mochiy Pop One · Kiwi Maru | Do Hyeon · Gowun Dodum |
| Klee One · Yuji Syuku | Gowun Batang · Nanum Brush Script |

English lyrics group several words per cut. An explicit `/` split takes precedence.

The language selection is saved in project JSON.

### First-run guide

On the first visit, an on-screen tour covers lyrics → audio → automatic creation → preview → line edits → export.

Reopen it with the **?** button at the top.

Preview volume and mute settings are remembered in the browser. They do not change the exported MP4's audio level.

## 860 expression parts

The 860 parts consist of 356 initial parts, 351 later additions, 50 typography parts, 51 kinetic parts, and 52 horror parts.

You can combine parts from different categories in one cut and use multiple decorations.

| Category | Count | Examples |
|---|---:|---|
| Layout | 184 | Center, vertical typesetting, speech bubble, manuscript paper, credits. |
| Entrance | 125 | Split and join, slice, domino, neon lighting. |
| Hold | 52 | Fine shake, floating, beat pulse, focus shift. |
| Exit | 109 | Explosion, closing door, erasure, breaking glass. |
| Decoration | 130 | Crosshair, radar, petals, constellations. |
| Text effect | 62 | Outline, glow, highlighter, color offset. |
| Background | 66 | Grid, aurora, night sky, rainy window. |
| Camera | 36 | Zoom, movement, handheld shake, rotation. |
| Screen effect | 69 | Glitch, inversion, flash, VHS. |
| Transition | 27 | Linear wipe, push, blinds, mosaic. |

Parts have mood tags; automatic creation favors parts matching the selected mood.

The basic set includes layout, entrance, hold, exit, glitch, flash, and texture effects.

## After Effects panels

Two panels built under the GULZA name are available.

Their menu names, generated composition names, diagnostic report filename, and CEP extension ID use GULZA.

The browser's **Export for AE** stores each cut's start and end time in JSON.

The ScriptUI panel applies these times to AE layer start and end points.

| Type | File | Purpose |
|---|---|---|
| ScriptUI | [`GULZA_AE.jsx`](GULZA_AE.jsx) | Create a composition from lyrics inside AE or import browser arrangement JSON. |
| CEP | [`GULZA_CEP.zip`](GULZA_CEP.zip) | Use the Korean browser editing interface inside an AE panel. |

### Install ScriptUI

1. Download `GULZA_AE.jsx`.
2. Place it in the AE installation's `Scripts/ScriptUI Panels` folder.
3. Restart AE and open **Window → GULZA_AE.jsx**.

Choose lyrics, style, frame size, and effects, then create a composition.

Start times can be automatic or derived from markers on a selected audio layer or the composition.

You can import **AE JSON** saved by the browser to create a composition with the same timing and arrangement.

Generated lyrics remain editable text layers.

### Install CEP

1. Download and extract `GULZA_CEP.zip`.
2. Run `install_win.bat` or `install_mac.command` for your operating system.
3. Restart AE and open **Window → Extensions → GULZA**.

CEP targets AE 2022 or later. Its extension ID (`com.ruruoni1.gulza`) is separate from the original JIZURA panel.

The installer copies the panel into the user's CEP extension folder and enables Adobe's unsigned CEP panel setting.

See the [CEP installation guide](cep/dist/README_CEP.md) for details.

Both panels offer lightweight generation, progress/stop controls, and diagnostics.

After Effects was not installed on the computer used for this release, so operation inside AE has not been confirmed.

## Development and publishing

Build the browser editions from the repository root:

```sh
python build.py
```

This generates root `index.html` and `sitemap.xml` from `src/`, `app/`, and `vendor/`.

GitHub Pages publishes the `main` branch root. The [default address](https://ruruoni1.github.io/gulza/) opens in Korean.

Japanese, English, Traditional and Simplified Chinese, Indonesian, and Vietnamese HTML files are generated in their language folders.

Build tools for the original After Effects panels are also included:

```sh
node tools/export_ae_data.js
python build_ae.py
python build_cep.py
```

The browser version is in [`VERSION`](VERSION), and changes are recorded in [`CHANGELOG.md`](CHANGELOG.md).

To add expression parts, see [`docs/EXPRESSION_PACKS.md`](docs/EXPRESSION_PACKS.md).

Rebuilt AE/CEP outputs still need to be checked inside After Effects.

## Recent updates

- **v0.16.1:** Added per-language share preview images, a favicon and structured data to the website, and expanded the search descriptions.
- **v0.16.0:** Themes in the simple mode now have two levels: 9 main themes and 35 sub themes. A sub theme drives the moods, styles and techniques of the randomizer and turns on the switches it needs.
- **v0.15.7:** Lines longer than 20 characters (spaces excluded) now show a warning; jump to the line to edit it, or keep it and continue.
- **v0.15.6:** Translated all 860 technique names on the Indonesian and Vietnamese pages, and polished awkward or duplicate names in Korean, English and Chinese.
- **v0.15.5:** The Korean interface now shows Korean names for 315 techniques that were displayed as English keys.
- **v0.15.4:** Preview looping is now off by default; the Loop button cycles whole → line → cut → off.
- **v0.15.3:** Translated the SRT import button and messages that were still in Japanese on the Chinese, Indonesian and Vietnamese pages.
- **v0.15.2:** Project, AE JSON and LRC saves now let you rename the file; without a song title, the loaded audio file name is suggested.
- **v0.15.1:** Gaps between SRT subtitles now show only the background and decorations instead of a countdown.
- **v0.15.0:** Gave cuts 2 and 4 in the Korean default sample more time while keeping the cut order and count.
- **v0.14.9:** Restored the original sample cut sequence and set its sentence timing between the earlier and slower versions.
- **v0.14.8:** The default sample now holds each sentence longer and avoids rapid cuts within a sentence.
- **v0.14.7:** Adjusted the Indonesian and Vietnamese toolbars so their longer labels stay on one row on desktop.
- **v0.14.6:** The top controls and links share one row on wide screens. The lyrics panel heading and buttons wrap cleanly in narrow columns.
- **v0.14.5:** Shortened the language menu to `🌐 LN` and the selected language. The GitHub and GoverseTV links now align to the right of the toolbar actions.
- **v0.14.4:** Added links to the GULZA GitHub repository and GoverseTV YouTube channel in the website toolbar. On mobile, open the menu to find them.
- **v0.14.3:** The sample video in all seven languages follows the same story: where GULZA's name comes from, a letter starting to move, subtitles becoming a scene, and words becoming a video.
- **v0.14.2:** Added a GULZA sample video for each language. Changing the interface language also changes the untouched sample.
- **v0.14.1:** Expanded all six translated guides and made the language selector easier to find.
- **v0.14.0:** Restored seven web editions, with Korean as the default.

[Full changelog (Korean)](CHANGELOG.md) · [v0.16.1 GitHub release](https://github.com/ruruoni1/gulza/releases/tag/v0.16.1)

## Original contributors and license

This project is a fork of [852wa/JIZURA](https://github.com/852wa/JIZURA).

It carries forward the translation and feature contributions noted in the original README.

- [Zaious](https://github.com/Zaious): Chinese interface and part names, font and language detection improvements.
- [andongmin94](https://github.com/andongmin94): Korean interface and part-name translations.
- [auliaramadhann](https://github.com/auliaramadhann), [enka25](https://github.com/enka25): Indonesian interface translations.
- [nocore-dtm](https://github.com/nocore-dtm): Cut preview, tap sync, looping, per-part replacement, and locking.
- [phamhuulocforwork](https://github.com/phamhuulocforwork): Vietnamese interface translation.

The source code uses the [MIT License](LICENSE).

Creators own the videos and images made with the tool. The respective rights holders retain rights to subtitles, lyrics, and audio.

Subtitles and audio are processed in the browser and are not uploaded to a server. Required fonts load from Google Fonts.

External software notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
