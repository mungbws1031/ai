/* ============================================================
   GULZA — 2-level themes (main → sub) for おまかせ in the easy panel.
   A sub fixes the moods, the styles and the core parts of every
   group; おまかせ switches on exactly those parts (plus a sprinkle
   of the mood's other parts), whatever their mood or part set, and
   turns on the switches they need (追加分 / 和風 / part sets).
   Generated from the theme plan; keys must exist in the registry.
   names: [ja, en, ko, zh-Hant, zh-Hans, id, vi]
   ============================================================ */
(() => {
'use strict';
J.THEME_TREE = {
  typo: { names: ["タイポグラフィ","Typography","타이포그래피","字體排印","字体排印","Tipografi","Nghệ thuật chữ"], subs: {
    editorial: { names: ["誌面・マガジン","Editorial & magazine","지면·매거진","版面·雜誌","版面·杂志","Editorial & majalah","Trang báo & tạp chí"], moods: ["editorial","graphic"], styles: ["newsprint","specimen","paper","kraft"],
      tone: {motion: 0.5,glitch: 0.15,decor: 0.6,texture: 0.7,chroma: 0.2,density: 0.5,koma: [0,12]},
      parts: { layout: ["magazine","headlineDeck","newspaper","columnsBig","dropCap","justified","contents","footnote","swissGrid","tyBaseline","proofread"], enter: ["type","wipe","tyLineWipe","fadeStagger","strokeOrder","tyUnderLift"], exit: ["wipe","tyStrike","tyLineFeed","blur","tyUnderSink"], decor: ["tyRunningHead","tyColophon","cropMarks","registration","guides","indexNum","crossOut"], treat: ["tyHeadRules","tyHeadBig","underline","boxed","emphasisDots"], bg: ["none","halftoneFade","splitV"], cam: ["push","knReadPan","panL"], fx: ["halftone","duotone"], trans: ["tyRuleWipe","wipe","pushSlide"] } },
    specimen: { names: ["組版見本","Type specimen","조판 견본","排版樣張","排版样张","Spesimen huruf","Mẫu sắp chữ"], moods: ["editorial","calm"], styles: ["specimen","mono","noir"],
      tone: {motion: 0.4,glitch: 0.1,decor: 0.4,texture: 0.4,chroma: 0.15,density: 0.4,koma: [0]},
      parts: { layout: ["typeSpecimen","tyIndexTable","tyScaleSteps","tyCross","tyFullTrack","tySquare","tyCropGiant","kanjiFocus","tyKeySplit","tyRotBlock"], enter: ["tyKeyFirst","tyDotGrow","trackIn","tyZoomOne","tyRetype"], exit: ["tyToDot","tyKeyLast","trackOutWide","tyToIndex"], decor: ["tyTypeScale","tyGlyphBody","tyTextRule","tyBigPunct","guides","plusGrid"], treat: ["tyHollowKey","tyIndexSup","outline","kerningWide","wide","tall"], bg: ["none","dotGrid"], cam: ["push","stepZoom"], fx: ["defocus"], trans: ["tyGridCells","tyRuleWipe"] } },
    notebook: { names: ["手書き・ノート","Handwriting & notebook","손글씨·노트","手寫·筆記","手写·笔记","Tulisan tangan & buku catatan","Chữ viết tay & sổ tay"], moods: ["calm","emotional"], styles: ["forest","kraft","paper"],
      tone: {motion: 0.45,glitch: 0.1,decor: 0.6,texture: 0.8,chroma: 0.15,density: 0.4,koma: [12]},
      parts: { layout: ["letterPaper","stickyNotes","genkou","postcard","polaroid","tape"], enter: ["strokeDraw","brushReveal","inkBleed","noteUnfold","stickerPeel","crumple"], exit: ["eraserOut","scribbleOut","crumpleOut","tearOut"], decor: ["scribbleCircle","scribbleUnder","highlightMark","tapePieces","ruledLines","paperClip","staple","punchHoles","indexTabs"], treat: ["marker","underline","circled","rotateAlt","baselineShift"], bg: ["tornPaper","paperCut","none"], cam: ["floatNoise","handheld","push"], fx: ["filmAdvance"], trans: ["inkBlob","cover"] } },
    minimal: { names: ["ミニマル","Minimal","미니멀","極簡","极简","Minimalis","Tối giản"], moods: ["calm","editorial"], styles: ["specimen","mono","noir","ocean"],
      tone: {motion: 0.3,glitch: 0.05,decor: 0.2,texture: 0.4,chroma: 0.1,density: 0.3,koma: [0]},
      parts: { layout: ["tyMargin","tyVRuler","tyRuby","tyJustify","tyErode","vcols","kanjiFocus","corners"], enter: ["trackIn","trackOut","blurStagger","tyRubyDrop"], exit: ["trackOutWide","blurOutStagger","outlineOut","tyBracketClose"], decor: ["guides","verticalStrip","watermarkKanji","romajiLine"], treat: ["kerningWide","fadeChars","tyHeadRules"], bg: ["none","vignettePulse","bigChar"], cam: ["push","pullOut","floatNoise"], fx: ["defocus","blackFrame"], trans: ["wipe","pushSlide"] } },
    fashion: { names: ["ファッション・ブランディング","Fashion & branding","패션·브랜딩","時尚·品牌","时尚·品牌","Fesyen & branding","Thời trang & thương hiệu"], moods: ["graphic","editorial"], styles: ["rouge","newsprint","caution","specimen"],
      tone: {motion: 0.6,glitch: 0.1,decor: 0.75,texture: 0.5,chroma: 0.25,density: 0.55,koma: [0,12]},
      parts: { layout: ["poster","stencil","crossBands","tyBandHide","splitScreen","frameBox","columnsBig","sideways"], enter: ["wipe","shutter","diagWipe","slideR","outlineFill"], exit: ["diagWipeOut","clapShut","sweepCover","slashOut"], decor: ["swatches","decoCorners","stripes","halfCircles","stripeCircle","cropMarks"], treat: ["stencilGap","fauxBold","splitColor","gradientV","outlineOffset"], bg: ["houndstooth","herringbone","argyle","tartan","chevron","borderFrame","splitH"], cam: ["snapPan","push","dutch"], fx: ["duotone","whiteFrame","blackFrame"], trans: ["diagonalWipe","sliceShift","pushSlide"] } },
  } },
  kinetic: { names: ["キネティック","Kinetic","키네틱","動態文字","动态文字","Kinetik","Chữ chuyển động"], subs: {
    slam: { names: ["ビートスラム","Beat slam","비트 슬램","節拍重擊","节拍重击","Hentakan ketukan","Dập theo nhịp"], moods: ["pop","graphic"], styles: ["caution","blueprint","acid","magenta"],
      tone: {motion: 0.95,glitch: 0.3,decor: 0.6,texture: 0.4,chroma: 0.4,density: 0.8,koma: [12,8]},
      parts: { layout: ["knSlamStack","knTypeSlam","knRhythmCuts","knCollide","huge","condensed","knZoomDive"], enter: ["knWordSlam","knTypeToSlam","knPushIn","stamp","bounceBig","zoom","knInertia"], exit: ["knWordKick","knPushOut","knLaunch","knJumpCutOut","knDiveGlyph"], decor: ["knWordTicks","knSpeedTrail","lineBurst"], treat: ["knWordScale","knWordPlate","fauxBold","hardShadow"], bg: ["bigStripes","splitDiag"], cam: ["knTiltKick","knJumpCut","knRushIn","beatPunch","crashZoom"], fx: ["zoomPunch","shake","flash","strobe","whipBlur"], trans: ["knStripSlam","knStutterCut","whipPan"] } },
    flow: { names: ["フロー","Flow","플로우","流動","流动","Aliran","Dòng chảy"], moods: ["pop","emotional"], styles: ["sunset","vapor","ocean","rouge"],
      tone: {motion: 0.75,glitch: 0.15,decor: 0.4,texture: 0.4,chroma: 0.35,density: 0.55,koma: [0]},
      parts: { layout: ["knFlowSnap","knPathRide","wave","orbit","ribbon","spiral","knSwapCenter","ring"], enter: ["knLoopIn","waveIn","slideWhole","spiralIn","windBlown","knReplaceIn"], exit: ["waveOut","flutterOut","drift","snakeOut","knCloseGap"], decor: ["waveLine","orbitDots","spiralLine","atomOrbit"], treat: ["sizeWave","gradientSweep","glow"], bg: ["auroraRibbons","meshBlobs","oceanWaves","triTess"], cam: ["orbitDrift","driftDiag","floatNoise","knReadPan"], fx: ["waveWarp","ripple","perspectiveTilt"], trans: ["pushSlide","whipPan","knCornerSwing"] } },
    mechanic: { names: ["メカニック・グラフィック","Mechanical & graphic","메카닉·그래픽","機械·圖像","机械·图形","Mekanis & grafis","Cơ khí & đồ họa"], moods: ["graphic","glitch"], styles: ["blueprint","transit","mint","newsprint"],
      tone: {motion: 0.7,glitch: 0.3,decor: 0.7,texture: 0.4,chroma: 0.3,density: 0.65,koma: [12]},
      parts: { layout: ["knGearWords","knQuarterTurn","knReflow","knPadGrid","cube","flipCards","slotMachine","flipBoard","cylinder","accordion"], enter: ["knHingeDrop","snapRail","splitFlap","odometer","flipX","cylinder","flipY","fold"], exit: ["slotOut","hingeOut","flipOutY","knStackAway","flipOutX","foldOut"], decor: ["dimension","crosshair","rulerEdge","progressRing","counter"], treat: ["boxed","extrude","outlineOffset"], bg: ["isoCubes","retroGrid","dotGrid"], cam: ["knCardFlip","knShearKick","stepZoom","barrelRoll"], fx: ["rotateSnap","tileShift","panelWipe","splitSlide"], trans: ["cubeTurn","knCornerSwing","sliceShift"] } },
    live: { names: ["ライブ・音楽","Live & music","라이브·음악","現場·音樂","现场·音乐","Live & musik","Biểu diễn & âm nhạc"], moods: ["pop","emotional"], styles: ["synth80","magenta","noir","sunset"],
      tone: {motion: 0.85,glitch: 0.3,decor: 0.7,texture: 0.5,chroma: 0.5,density: 0.7,koma: [12]},
      parts: { layout: ["equalizer","vinyl","knPadGrid","bulbs","huge","knRhythmCuts"], enter: ["echoCount","knWordSpin","knStretchOut","bounceBig","neonOn"], exit: ["knWordBlink","lampOff","bounceOff","popOut"], decor: ["musicNotes","volumeBars","spectrumRing","waveform","beatRing","mediaControls"], treat: ["neonOutline","glow","sizeWave"], bg: ["eqBars","spotlight","particlesBg","concentric"], cam: ["beatPunch","bounce","handheld","shakeHard"], fx: ["heartbeat","strobe","zoomPunch","bloomFlash","echoFrames"], trans: ["flashCross","knStutterCut"] } },
  } },
  ballad: { names: ["エモ・バラード","Emotional ballad","감성·발라드","抒情·情歌","抒情·情歌","Emosional & balada","Cảm xúc & ballad"], subs: {
    night: { names: ["夜明け・夜","Dawn & night","새벽·밤","黎明·夜晚","黎明·夜晚","Fajar & malam","Bình minh & đêm"], moods: ["calm","emotional"], styles: ["ocean","gold","noir","hud"],
      tone: {motion: 0.4,glitch: 0.15,decor: 0.4,texture: 0.6,chroma: 0.3,density: 0.35,koma: [0]},
      parts: { layout: ["center","vcols","circleWords","stack","halfVertical","arcTop","mirror"], enter: ["blur","fadeStagger","backlight","riseMask","echoIn","glint"], exit: ["drift","blur","dissolve","zoomFar","echoOut"], decor: ["starField","moonPhases","fireflies","bokeh","constellation","risingParticles"], treat: ["glow","softShadow","reflection"], bg: ["starfield","nightMoon","horizonGlow","bokehBg","particlesBg"], cam: ["push","floatNoise","rackFocus","focusIn"], fx: ["bloomFlash","lightRays","defocus"], trans: ["irisOpen","flashCross"] } },
    spring: { names: ["春・パステル","Spring & pastel","봄·파스텔","春天·粉彩","春天·粉彩","Musim semi & pastel","Mùa xuân & pastel"], moods: ["emotional","calm","pop"], styles: ["candy","sunset","sakura"],
      tone: {motion: 0.5,glitch: 0.05,decor: 0.65,texture: 0.3,chroma: 0.2,density: 0.45,koma: [0]},
      parts: { layout: ["center","postcard","polaroid","hanging","circle","balloons","nameTag"], enter: ["blur","fadeStagger","springIn","rockSettle","pendulum"], exit: ["balloonOff","drift","blur","gravity"], decor: ["cloudPuffs","bubbles","musicNotes","dandelion","heartsStars","vines","twinkle"], treat: ["softShadow","sticker","circled","rainbow"], bg: ["meshBlobs","bokehBg","cloudLayers","gradientSweep","polka"], cam: ["floatNoise","push","bounce"], fx: ["bloomFlash","lightSweep","whiteFrame"], trans: ["irisOpen","cover"] } },
    sunset: { names: ["夕焼け・夏","Sunset & summer","노을·여름","夕陽·夏天","夕阳·夏天","Senja & musim panas","Hoàng hôn & mùa hè"], moods: ["emotional","pop"], styles: ["sunset","gold","vapor"],
      tone: {motion: 0.55,glitch: 0.2,decor: 0.45,texture: 0.5,chroma: 0.45,density: 0.5,koma: [0]},
      parts: { layout: ["huge","center","condensed","stack","marquee","billboard"], enter: ["backlight","overexpose","zoomOut","assemble","heatHaze"], exit: ["hazeOut","overexposeOut","drift","riseOut"], decor: ["sunRays","lightLeak","sparks","bokeh"], treat: ["gradientV","glow","longShadow"], bg: ["sunsetSun","oceanWaves","duotoneSweep","godRays","skyline"], cam: ["push","driftDiag","dollyIn"], fx: ["lightRays","anamorphic","bloomFlash","lightSweep"], trans: ["flashCross","pushSlide"] } },
    rain: { names: ["雨・雪","Rain & snow","비·눈","雨·雪","雨·雪","Hujan & salju","Mưa & tuyết"], moods: ["calm","emotional"], styles: ["ocean","paper","mono","forest"],
      tone: {motion: 0.35,glitch: 0.15,decor: 0.4,texture: 0.7,chroma: 0.2,density: 0.35,koma: [0]},
      parts: { layout: ["rain","vcols","center","stack","maskReveal","quote"], enter: ["blur","riseMask","dropMask","ripple","liquidFill","blurStagger"], exit: ["melt","sinkMask","floodOut","drift","sandOut"], decor: ["rainStreaks","rainRipples","snow","smoke"], treat: ["waterline","reflection","fadeChars","focusPull"], bg: ["rainWindow","snowLayers","ripples","cloudLayers","noiseField"], cam: ["push","rackFocus","tiltDown"], fx: ["ripple","defocus","dustScratches"], trans: ["blockDissolve","wipe"] } },
    nature: { names: ["自然・風景","Nature & landscape","자연·풍경","自然·風景","自然·风景","Alam & lanskap","Thiên nhiên & phong cảnh"], moods: ["calm","emotional","editorial"], styles: ["forest","ocean","paper","gold"],
      tone: {motion: 0.4,glitch: 0.05,decor: 0.45,texture: 0.6,chroma: 0.15,density: 0.35,koma: [0]},
      parts: { layout: ["contour","flag","origami","shadowPlay","wall","bookSpine"], enter: ["unroll","blurStagger","windBlown","glint"], exit: ["sandOut","candleOut","flutterOut","drift"], decor: ["vines","cloudPuffs","sunRays","fireflies","dandelion"], treat: ["softShadow","reflection","fadeChars"], bg: ["mountains","ridgePlot","topoLines","marble","cloudLayers"], cam: ["push","pullOut","tiltUp","driftDiag"], fx: ["lightRays","defocus"], trans: ["wipe","irisOpen"] } },
  } },
  pop: { names: ["ポップ","Pop","팝","普普","波普","Pop","Pop"], subs: {
    candy: { names: ["キャンディポップ","Candy pop","캔디 팝","糖果普普","糖果波普","Pop permen","Pop kẹo ngọt"], moods: ["pop"], styles: ["candy","magenta","sakura"],
      tone: {motion: 0.85,glitch: 0.1,decor: 0.9,texture: 0.2,chroma: 0.3,density: 0.65,koma: [12]},
      parts: { layout: ["bubbles","balloons","stickerBomb","keycaps","bounceLine","mixed","pill","elastic"], enter: ["pop","bounceBall","springIn","squashDrop","rubber","bubbles"], exit: ["popOut","balloonOff","bounceOff","shrink","deflateOut"], decor: ["heartsStars","confetti","polkaPatch","memphis","sparks","starburst","zigzagRibbon"], treat: ["sticker","rainbow","sizeWave","alternate"], bg: ["polka","checker","meshBlobs","halftoneFade"], cam: ["bounce","jelly","beatPunch"], fx: ["zoomPunch","starGlint","squash"], trans: ["irisOpen","checker","knCornerSwing"] } },
    sns: { names: ["SNS・インターフェース","Social & interface","SNS·인터페이스","社群·介面","社交·界面","Media sosial & antarmuka","Mạng xã hội & giao diện"], moods: ["pop","graphic"], styles: ["magenta","blueprint","candy","mint"],
      tone: {motion: 0.7,glitch: 0.1,decor: 0.7,texture: 0.2,chroma: 0.2,density: 0.6,koma: [12]},
      parts: { layout: ["chat","notification","searchBar","bubble","crowdBubbles","ticker"], enter: ["type","pop","cursorSweep","loadingBar","slideL"], exit: ["backspace","slideOutL","shrink","popOut"], decor: ["likeCounter","notifBell","cursorClick","progressBar","toggleSwitch","windowChrome","spinner","loopArrows"], treat: ["boxed","marker","circled"], bg: ["none","dotGrid","gradientSweep"], cam: ["push","whipIn","snapPan"], fx: ["zoomPunch","snapshot","loopScroll"], trans: ["pushSlide","cover","uncover"] } },
    comic: { names: ["マンガ・コラージュ","Comic & collage","만화·콜라주","漫畫·拼貼","漫画·拼贴","Komik & kolase","Truyện tranh & cắt dán"], moods: ["pop","graphic"], styles: ["caution","kraft","newsprint","magenta"],
      tone: {motion: 0.85,glitch: 0.2,decor: 0.85,texture: 0.5,chroma: 0.3,density: 0.7,koma: [8,12]},
      parts: { layout: ["panels","burst","ransom","stickerBomb","bubble","labels","crowdBubbles"], enter: ["stamp","pop","stickerPeel","tornJoin","zoom"], exit: ["peelOff","tearOut","explode","crumpleOut"], decor: ["starburst","lineBurst","speedCorner","halftonePatch","arrows"], treat: ["ransom","toneShadow","hardShadow","extrude"], bg: ["speedLines","halftoneFade","sunburst","bigStripes"], cam: ["crashZoom","dutch","shakeHard"], fx: ["focusLines","halftone","flash","shake"], trans: ["shatterTiles","knStripSlam","flashCross"] } },
    toy: { names: ["あそび・おもちゃ","Play & toys","놀이·장난감","遊戲·玩具","游戏·玩具","Permainan & mainan","Trò chơi & đồ chơi"], moods: ["pop","graphic"], styles: ["candy","caution","kraft","transit"],
      tone: {motion: 0.8,glitch: 0.1,decor: 0.7,texture: 0.3,chroma: 0.25,density: 0.6,koma: [12,8]},
      parts: { layout: ["crossword","wordSearch","puzzle","dominoes","blocks","magnets","tiles","pile","knTumble","knSeesaw"], enter: ["slingshot","rollIn","domino","magnet","shuffle","stopMotion","tokoroten","quarters"], exit: ["dominoOut","rollOff","scatter","vacuumOut","shatterLite","twist"], decor: ["shapes","dots","checkerStrip","tally","halfCircles"], treat: ["extrude","alternate","circled"], bg: ["checker","polka","dotGrid"], cam: ["bounce","jelly","knCardFlip"], fx: ["squash","colorBars"], trans: ["checker","shatterTiles"] } },
  } },
  retro: { names: ["レトロ","Retro","레트로","復古","复古","Retro","Hoài cổ"], subs: {
    synth: { names: ["シンセウェイブ80s","Synthwave 80s","신스웨이브 80s","合成波 80s","合成波 80s","Synthwave 80-an","Synthwave thập niên 80"], moods: ["pop","glitch","emotional"], styles: ["synth80","vapor","acid"],
      tone: {motion: 0.7,glitch: 0.5,decor: 0.6,texture: 0.5,chroma: 0.75,density: 0.6,koma: [12]},
      parts: { layout: ["neon","ledScroll","dotMatrix","perspective","tunnel","bulbs"], enter: ["neonOn","crtOn","interlace","scramble","zoom"], exit: ["lampOff","rgbSplitOut","scanOut","zoomFar"], decor: ["spectrumRing","waveform","volumeBars","starField","sparks"], treat: ["neonOutline","chrome","glitchSplit"], bg: ["retroGrid","sunsetSun","starfield","squareTunnel","scanBars"], cam: ["dollyIn","orbitDrift","vertigo"], fx: ["rgbSplit","chroma","bloomFlash","anamorphic","interlace","radialChroma"], trans: ["flashCross","pixelate","zoomThrough"] } },
    vhs: { names: ["VHS・思い出","VHS & memories","VHS·추억","VHS·回憶","VHS·回忆","VHS & kenangan","VHS & kỷ niệm"], moods: ["emotional","glitch"], styles: ["vapor","hrNightRec","sunset","noir"],
      tone: {motion: 0.5,glitch: 0.5,decor: 0.45,texture: 0.8,chroma: 0.55,density: 0.45,koma: [12,8]},
      parts: { layout: ["filmstrip","polaroid","cassette","vinyl","calendar","nameTag"], enter: ["filmFeed","lightLeak","crtOn","dither"], exit: ["burn","overexposeOut","lampOff","echoOut"], decor: ["timecodeBar","dateStamp","lightLeak","mediaControls"], treat: ["glitchSplit","softShadow","fadeChars"], bg: ["vhsBand","filmStrip","letterbox","noiseField"], cam: ["handheld","floatNoise","push"], fx: ["vhsRoll","filmBurn","trackingNoise","dustScratches","crtOff"], trans: ["blockDissolve","flashCross"] } },
    print: { names: ["レトロ印刷","Retro print","레트로 인쇄","復古印刷","复古印刷","Cetak retro","In ấn hoài cổ"], moods: ["graphic","editorial"], styles: ["newsprint","kraft","caution","transit"],
      tone: {motion: 0.6,glitch: 0.2,decor: 0.7,texture: 0.9,chroma: 0.35,density: 0.55,koma: [8]},
      parts: { layout: ["poster","halftoneBig","stampSheet","ticket","priceTag","stationSign","warningLabel","routeMap"], enter: ["stamp","printRegister","hatchFill","wipe"], exit: ["halftoneOut","stripesOut","sweepCover","rollUpOut"], decor: ["registration","halftonePatch","cropMarks","barcode","indexNum"], treat: ["halftone","outlineOffset","toneShadow","hatch"], bg: ["halftoneFade","bigStripes","tvBars","splitDiag"], cam: ["push","snapPan"], fx: ["halftone","duotone","posterize","ditherBit"], trans: ["sliceShift","checker"] } },
    cinema: { names: ["シネマ・オープニング","Cinema & opening titles","시네마·오프닝","電影·片頭","电影·片头","Sinema & judul pembuka","Điện ảnh & mở đầu"], moods: ["emotional","editorial"], styles: ["noir","gold","mono","specimen"],
      tone: {motion: 0.45,glitch: 0.1,decor: 0.35,texture: 0.7,chroma: 0.25,density: 0.35,koma: [0]},
      parts: { layout: ["credits","clapper","curtain","shadowPlay","wall","frameBox","quote"], enter: ["iris","shutter","fadeStagger","backlight","unroll"], exit: ["irisClose","flipOutX","blurOutStagger","lampOff"], decor: ["brackets","cropMarks","timecodeBar"], treat: ["softShadow","kerningWide","reflection"], bg: ["letterbox","spotlight","bigChar","filmStrip"], cam: ["dollyIn","pullOut","vertigo","panR"], fx: ["blackFrame","whiteFrame","irisTrans","doors","filmBurn","anamorphic"], trans: ["irisOpen","doorsOpen","flashCross"] } },
  } },
  cyber: { names: ["グリッチ・サイバー","Glitch & cyber","글리치·사이버","故障·賽博","故障·赛博","Glitch & siber","Glitch & cyber"], subs: {
    glitch: { names: ["デジタルグリッチ","Digital glitch","디지털 글리치","數位故障","数字故障","Glitch digital","Glitch kỹ thuật số"], moods: ["glitch"], styles: ["noir","crimson","acid","mono"],
      tone: {motion: 0.8,glitch: 0.9,decor: 0.45,texture: 0.7,chroma: 0.9,density: 0.75,koma: [12]},
      parts: { layout: ["glitchGrid","sliceStack","condensed","huge","tile","mosaicTiles","tySplitType","splitHalves"], enter: ["glitchIn","slice","scramble","flicker","vSlice","resolve","randomOrder"], exit: ["glitch","glitchDissolve","scrambleOut","vSliceDrop","mosaicOut","slice"], decor: ["glitchRects","barcode","qrBlock","bars","slash"], treat: ["glitchSplit","cutShift","stencilGap"], bg: ["scanBars","noiseField","dotGrid"], cam: ["knJumpCut","shakeHard","knShearKick"], fx: ["slice","block","pixelSort","macroBlock","pixelDrift","rgbSplit","bandInvert","smear","mosaic"], trans: ["blockDissolve","pixelate","sliceShift"] } },
    hud: { names: ["HUD・ターミナル","HUD & terminal","HUD·터미널","HUD·終端機","HUD·终端","HUD & terminal","HUD & terminal"], moods: ["glitch","graphic"], styles: ["hud","mint","blueprint","noir"],
      tone: {motion: 0.6,glitch: 0.45,decor: 0.85,texture: 0.6,chroma: 0.5,density: 0.6,koma: [12]},
      parts: { layout: ["dotMatrix","searchBar","gridCells","labels","ruler","tyStatCount","edgeFrame"], enter: ["type","resolve","matrixRain","cursorSweep","loadingBar","loupe"], exit: ["backspace","matrixOut","scanOut","scrambleOut","tyToIndex"], decor: ["reticle","radar","crosshair","headingTape","dataColumns","glyphLock","circuit","sonarArcs","progressRing","hexGrid","rings"], treat: ["boxed","dotted","inline"], bg: ["dotGrid","scanBars","hexGrid","retroGrid"], cam: ["focusIn","stepZoom","snapPan"], fx: ["scanBar","edgeDetect","interlace","chroma","negativeRing"], trans: ["tyGridCells","pixelate","wipe"] } },
    acid: { names: ["アシッド・レイブ","Acid & rave","애시드·레이브","酸性·銳舞","酸性·锐舞","Acid & rave","Acid & rave"], moods: ["glitch","pop"], styles: ["acid","synth80","crimson"],
      tone: {motion: 0.95,glitch: 0.75,decor: 0.7,texture: 0.5,chroma: 0.85,density: 0.85,koma: [8,12]},
      parts: { layout: ["huge","condensed","kaleido","fisheye","tunnel","zoomRepeat","depthStack"], enter: ["zoom","flicker","stretch","zoomAlt","echoIn"], exit: ["explode","shockOut","stretch","tornadoOut","glassBreak"], decor: ["lineBurst","spectrumRing","beatRing","triangleSpin","concentricSquares"], treat: ["rainbow","echoOutline","shadowStack"], bg: ["kaleidoscope","moire","squareTunnel","sunburst","spiralArms"], cam: ["spiralIn","barrelRoll","earthquake","crashZoom"], fx: ["strobe","invert","hueShift","kaleido","bulge","zoomStutter","shatter","gridRepeat","mirrorFlash"], trans: ["flashCross","spinOut","zoomThrough"] } },
  } },
  wa: { names: ["和風","Japanese","일본풍","和風","和风","Gaya Jepang","Phong cách Nhật"], subs: {
    sakura: { names: ["桜","Cherry blossoms","벚꽃","櫻花","樱花","Sakura","Hoa anh đào"], moods: ["emotional","calm"], styles: ["sakura","sumi"],
      tone: {motion: 0.45,glitch: 0.05,decor: 0.55,texture: 0.5,chroma: 0.2,density: 0.4,koma: [0]},
      parts: { layout: ["tanzaku","kakejiku","vcols","arcTop","shoji"], enter: ["fanOpen","brushReveal","blur","fadeStagger"], exit: ["fanClose","flutterOut","drift"], decor: ["petals","kasumi","tsukiKumo","seigaiha","bracketsJP"], treat: ["softShadow","emphasisDots","bracketsQuote"], bg: ["seigaiha","asanoha","meshBlobs"], cam: ["push","floatNoise"], fx: ["bloomFlash","lightSweep"], trans: ["irisOpen","inkBlob"] } },
    sumi: { names: ["墨・書","Ink & calligraphy","먹·서예","墨·書法","墨·书法","Tinta & kaligrafi","Mực & thư pháp"], moods: ["calm","editorial"], styles: ["sumi","paper","mono"],
      tone: {motion: 0.4,glitch: 0.1,decor: 0.4,texture: 0.85,chroma: 0.1,density: 0.35,koma: [0,12]},
      parts: { layout: ["kakejiku","genkou","hanko","shoji","vcols","kanjiFocus"], enter: ["brushReveal","strokeOrder","inkDrop","inkBleed"], exit: ["undraw","melt","dissolve","fanClose"], decor: ["seal","brushStroke","kamon","kasumi","asanoha"], treat: ["monoGrid","emphasisDots","fadeChars"], bg: ["asanoha","paperCut","none"], cam: ["push","tiltDown"], fx: ["defocus","halftone"], trans: ["inkBlob","wipe"] } },
    matsuri: { names: ["祭り","Festival","축제","祭典","祭典","Festival","Lễ hội"], moods: ["pop","emotional"], styles: ["sumi","gold","sunset","sakura"],
      tone: {motion: 0.75,glitch: 0.2,decor: 0.8,texture: 0.5,chroma: 0.3,density: 0.6,koma: [12]},
      parts: { layout: ["chochin","ema","omikuji","noren","karuta","tanzaku"], enter: ["fanOpen","pop","stamp","dropMask"], exit: ["fanClose","rocketOff","flutterOut"], decor: ["hanabi","chochin","shimenawa","sensu","momiji","namiGashira"], treat: ["glow","fauxBold","circled"], bg: ["fireworks","seigaiha","sunburst"], cam: ["push","bounce","beatPunch"], fx: ["flash","bloomFlash","starGlint"], trans: ["doorsOpen","flashCross"] } },
  } },
  horror: { names: ["ホラー","Horror","호러","恐怖","恐怖","Horor","Kinh dị"], subs: {
    ruin: { names: ["廃墟・心霊","Ruins & spirits","폐허·심령","廢墟·靈異","废墟·灵异","Reruntuhan & arwah","Phế tích & hồn ma"], moods: ["horror"], styles: ["hrRuin","mono","noir"],
      tone: {motion: 0.4,glitch: 0.4,decor: 0.4,texture: 0.95,chroma: 0.3,density: 0.4,koma: [8,12]},
      parts: { layout: ["hrRisingDark","hrSpiritPhoto","hrWrongShadow","hrDoorGap","hrFlashlight"], enter: ["hrManifest","hrBlinkCreep","hrUneasy","blur"], exit: ["hrSwallow","hrPulledDown","hrTurnAway","hrShiver","dissolve"], decor: ["hrDustBeam","hrCracks","hrWatchEye","smoke"], treat: ["hrEroded","hrDoubleExp","fadeChars"], bg: ["hrCorridor","hrDeadTrees","hrFailingLamp","hrMold"], cam: ["hrNervous","floatNoise","push"], fx: ["hrPassingShadow","defocus","dustScratches"], trans: ["hrBlink","hrStaticCut"] } },
    found: { names: ["録画映像","Found footage","녹화 영상","錄影畫面","录像画面","Rekaman temuan","Băng ghi hình"], moods: ["horror","glitch"], styles: ["hrNightRec","mono","crimson"],
      tone: {motion: 0.5,glitch: 0.65,decor: 0.35,texture: 0.9,chroma: 0.45,density: 0.45,koma: [12]},
      parts: { layout: ["hrCctv","hrStaticTv","hrRedacted","subtitleBar"], enter: ["hrVhold","hrJumpScare","crtOn","interlace"], exit: ["hrFlickerDie","lampOff","scanOut","glitch"], decor: ["hrStaticPatch","timecodeBar","dateStamp","reticle"], treat: ["hrRedact","glitchSplit"], bg: ["vhsBand","noiseField","scanBars","hrFailingLamp"], cam: ["hrNervous","hrDutchSnap","handheld"], fx: ["hrSignalLoss","hrSubliminal","tvStatic","trackingNoise"], trans: ["hrStaticCut","pixelate"] } },
    curse: { names: ["呪い・まじない","Curses & rituals","저주·주술","詛咒·咒術","诅咒·咒术","Kutukan & ritual","Lời nguyền & bùa chú"], moods: ["horror","editorial"], styles: ["hrCurse","sumi","crimson"],
      tone: {motion: 0.4,glitch: 0.45,decor: 0.45,texture: 0.9,chroma: 0.3,density: 0.4,koma: [8]},
      parts: { layout: ["hrOuija","hrMissing","hrWallScrawl","hrWrongOne","letterPaper"], enter: ["hrClawReveal","hrMirrorSnap","inkBleed","strokeOrder"], exit: ["hrDrain","hrLookBack","burn","scorchOut"], decor: ["hrSigil","hrScratches","hrDrips","seal"], treat: ["hrInkBleed","hrEroded","rotateAlt"], bg: ["hrMold","tornPaper","paperCut"], cam: ["hrDutchSnap","floatNoise"], fx: ["hrSubliminal","invert","filmBurn"], trans: ["hrBlink","inkBlob"] } },
  } },
  talk: { names: ["話す字幕（SRT）","Speech captions (SRT)","말 자막(SRT)","口語字幕（SRT）","口语字幕（SRT）","Teks ucapan (SRT)","Phụ đề lời nói (SRT)"], subs: {
    interview: { names: ["インタビュー・Vlog","Interview & vlog","인터뷰·브이로그","訪談·Vlog","访谈·Vlog","Wawancara & vlog","Phỏng vấn & vlog"], moods: ["calm","editorial"], styles: ["specimen","paper","ocean","noir"],
      tone: {motion: 0.25,glitch: 0,decor: 0.15,texture: 0.2,chroma: 0.05,density: 0.25,koma: [0]},
      parts: { layout: ["subtitleBar","lowerThird","center","quote","frameBox","letterPaper","bubble"], enter: ["fadeStagger","blur","riseMask"], exit: ["blur","sinkMask","cut"], decor: ["highlightMark","leaders"], treat: ["softShadow","outlineFill","boxed"], bg: ["none","letterbox"], cam: ["push"], fx: [], trans: ["wipe","pushSlide"] } },
    news: { names: ["ニュース・情報","News & info","뉴스·정보","新聞·資訊","新闻·资讯","Berita & info","Tin tức & thông tin"], moods: ["editorial","graphic"], styles: ["newsprint","transit","blueprint","specimen"],
      tone: {motion: 0.45,glitch: 0.05,decor: 0.35,texture: 0.2,chroma: 0.1,density: 0.4,koma: [0]},
      parts: { layout: ["lowerThird","ticker","headlineDeck","subtitleBar","justified","notification","dropCap"], enter: ["wipe","slideL","type","splitFlap"], exit: ["wipe","slideOutL","sweepCover"], decor: ["indexNum","timecodeBar","arrows","highlightMark","dimension"], treat: ["boxed","marker","underline"], bg: ["none","splitV","tvBars"], cam: ["push","panL"], fx: ["panelWipe"], trans: ["wipe","pushSlide","diagonalWipe"] } },
    lecture: { names: ["講義・解説","Lecture & explainer","강의·설명","講課·解說","讲课·解说","Kuliah & penjelasan","Bài giảng & giải thích"], moods: ["editorial","calm"], styles: ["specimen","paper","forest","blueprint"],
      tone: {motion: 0.3,glitch: 0,decor: 0.35,texture: 0.3,chroma: 0.05,density: 0.3,koma: [0]},
      parts: { layout: ["numbered","contents","footnote","dictionary","proofread","genkou","lowerThird","type"], enter: ["type","fadeStagger","strokeDraw","cursorSweep"], exit: ["wipe","blur","tyStrike"], decor: ["highlightMark","scribbleCircle","scribbleUnder","arrows","leaders","ruledLines"], treat: ["marker","underline","circled"], bg: ["none","dotGrid"], cam: ["push"], fx: [], trans: ["wipe","pushSlide"] } },
    variety: { names: ["バラエティ字幕","Variety show captions","예능 자막","綜藝字幕","综艺字幕","Teks acara varietas","Phụ đề gameshow"], moods: ["pop","graphic"], styles: ["caution","magenta","candy","kraft"],
      tone: {motion: 0.8,glitch: 0.1,decor: 0.7,texture: 0.2,chroma: 0.2,density: 0.55,koma: [12]},
      parts: { layout: ["subtitleBar","lowerThird","center","chat","bubble","burst"], enter: ["bounceBig","squashDrop","springIn","stamp"], exit: ["shrink","whipOut","popOut","cut"], decor: ["heartsStars","sparks","confetti","arrows"], treat: ["outlineFill","doubleOutline","sticker","extrude","fauxBold"], bg: ["none","sunburst","polka"], cam: ["crashZoom","beatPunch","bounce"], fx: ["zoomPunch","zoomStutter","shake"], trans: ["whipPan","irisOpen"] } },
  } },
};
J.THEME_ORDER2 = Object.keys(J.THEME_TREE);
// themes saved by older versions
J.THEME_COMPAT = { lyricpv: 'typo' };
J.themeMainId = id => (J.THEME_TREE[id] ? id : J.THEME_TREE[J.THEME_COMPAT[id]] ? J.THEME_COMPAT[id] : null);
const LANGS = ['ja', 'en', 'ko', 'zh-Hant', 'zh-Hans', 'id', 'vi'];
J.themeLabel = node => {
  const l = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || 'ja';
  const i = LANGS.findIndex(x => l === x || l.startsWith(x + '-'));
  return node.names[i < 0 ? 0 : i];
};

const MIN = { layout: 6, enter: 5, exit: 5, hold: 3, decor: 6, treat: 4, bg: 4, cam: 3, fx: 4, trans: 3 };
const clamp01 = x => Math.max(0, Math.min(1, x));
J.omakaseTheme = (project, rnd = Math.random, mainId, subId) => {
  const M = J.THEME_TREE[mainId];
  if (!M) return J.omakase(project, rnd);
  const keys = Object.keys(M.subs);
  const sk = M.subs[subId] ? subId : keys[Math.floor(rnd() * keys.length) % keys.length];
  const S = M.subs[sk];
  const pick = a => a[Math.floor(rnd() * a.length) % a.length];
  // the switches the sub's parts and styles need
  const switches = {};
  const need = d => { if (!d) return; if (d.extra) switches.extra = true; if (d.wa) switches.wa = true; if (d.set) switches[d.set] = true; };
  for (const g of J.GROUP_KEYS) for (const k of S.parts[g] || []) need(J.registry(g)[k]);
  S.styles.forEach(k => need(J.STYLES[k]));
  const P = Object.assign({}, project, switches);
  // fonts, colours, a new seed and the kept overrides come from the usual おまかせ
  const base = J.omakase(P, rnd);
  const mood = pick(S.moods.filter(m => J.MOODS[m]));
  const MD = J.MOODS[mood];
  const styles = S.styles.filter(k => J.STYLES[k]);
  const style = pick(styles.length > 1 ? styles.filter(k => k !== project.style) : styles);
  // strengths: the mood's ranges, then the sub's tone (with a little play)
  const fx = Object.assign({}, base.fx);
  for (const [k, r] of Object.entries(MD.fx)) fx[k] = +(r[0] + (r[1] - r[0]) * rnd()).toFixed(2);
  for (const k of ['motion', 'glitch', 'decor', 'texture', 'chroma', 'density']) if (S.tone[k] != null) fx[k] = +clamp01(S.tone[k] + (rnd() - 0.5) * 0.16).toFixed(2);
  fx.koma = pick(S.tone.koma); fx.onTwos = fx.koma > 0;
  // parts: the sub's own parts always (any mood or set), a sprinkle of the mood's other parts, a minimum count
  const enabled = {};
  for (const g of J.GROUP_KEYS) {
    const core = new Set((S.parts[g] || []).filter(k => J.registry(g)[k]));
    const on = {};
    const others = [];
    for (const k of J.order(g)) {
      const d = J.registry(g)[k]; if (!d || d.special) continue;
      if (core.has(k)) { on[k] = true; continue; }
      const ok = (!J.randomOk || J.randomOk(P, g, k)) && !(d.set && d.set !== MD.set && J.SETS[d.set] && Object.values(J.MOODS).some(m => m.set === d.set));
      const tagged = d.tags && d.tags.includes(mood);
      on[k] = ok && tagged && g === 'hold';          // a sub lists no idle motions: hold follows the mood
      if (ok && tagged && !on[k]) others.push(k);
    }
    // the core stays the bulk: two of the mood's other parts for variety, more only to reach the minimum
    let n = Object.values(on).filter(Boolean).length;
    const want = Math.max((MIN[g] || 3) - n, 0) + 2;
    for (let j = 0; j < want && others.length; j++) on[others.splice(Math.floor(rnd() * others.length), 1)[0]] = true;
    enabled[g] = on;
  }
  enabled.enter.cut = true; enabled.exit.cut = true;
  if (enabled.treat) enabled.treat.none = true;
  if (enabled.bg) enabled.bg.none = true;
  if (enabled.cam) enabled.cam.push = true;
  for (const k of (MD.noHold || [])) if (enabled.hold[k] !== undefined) enabled.hold[k] = false;
  enabled.hold.still = true;
  return Object.assign({}, base, { mood, style, fx, enabled, subId: sk }, switches);
};
})();
