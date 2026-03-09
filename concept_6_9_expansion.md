# Urine Collection Stick — Deep-Dive Expansion for Concepts #6, #7, #8, #9

## 1) Project definition

### 1.1 Product intent
Design a **flat, injection-molded urine collection stick** that is dipped in urine, moved to a reader, and inserted to trigger reliable LFA processing.

### 1.2 Fixed constraints
- Stick cross-section: flat form factor, **max thickness 5.5 mm**, width **17.89 mm**.
- Collection method: user dip in cup.
- Metering target: **~120 µL net sample delivered to assay system**.
- Stick may be transported before insertion.
- Sample must transfer reliably to LFA strip after insertion.

### 1.3 Design success criteria
1. Metering reproducibility around 120 µL.
2. Low user burden (few steps, intuitive cues).
3. Low leak/drip risk during transport.
4. Robust LFA strip wetting profile (minimal bolus shock).
5. High-volume manufacturability via plastic injection molding + practical assembly.

### 1.4 Evaluation frame used in this document
Each concept is expanded with:
- internal cross-section structure
- capillary flow path
- reservoir volume estimate for ~120 µL
- urine-to-LFA interaction
- user handling behavior
- leak prevention
- molding/assembly feasibility

---

## 2) UX research synthesis (translated into engineering requirements)

### 2.1 Observed user behavior risks (home and near-care settings)
- Inconsistent dip depth and dip time.
- Angled dipping and partial submersion.
- Immediate movement after dip (walking to reader).
- User uncertainty about “ready” state.
- Occasional over-dipping and re-dipping.

### 2.2 UX-derived requirements
- Collection should be tolerant to orientation and moderate timing variation.
- “Filled” state should be obvious (visual/tactile/system-guided).
- No exposed pooled liquid at tip after removal.
- Prefer passive operation; if active step exists, it must be obvious and binary.

### 2.3 Human factors guidance applied to concepts #6–#9
- Provide clear dip line and orientation markings.
- Keep reader insertion force and path deterministic (single hard stop).
- Prevent user need to estimate volume or counting time precisely.
- Isolate assay timing from user transport timing where possible.

---

## 3) Design exploration (Concepts #6, #7, #8, #9)

## Concept #6 — Capillary Comb Tip

### Internal cross-section structure
- Dip-end comb (8–14 tines) creates multiple capillary entry slits.
- Downstream transverse manifold merges inflow.
- Enclosed metering chamber behind manifold.
- Narrow transfer neck to LFA sample pad interface.
- Separate vent microchannel with splash shield.

### Capillary flow path
1. Urine wets comb slits.
2. Parallel capillary inflow from each slit into manifold.
3. Chamber fills while vent displaces air.
4. Flow arrests at capillary stop geometry.
5. On insertion, chamber neck feeds LFA pad.

### Reservoir size estimation (~120 µL)
- 120 µL = 120 mm³.
- Example chamber: 12.0 mm × 10.0 mm × 1.0 mm = 120 mm³.
- Recommended gross chamber: 125–130 mm³ with calibrated stop to deliver ~120 µL effective.

### User handling behavior
- Dip until tip marker submerged; hold ~3–5 s.
- Remove and move to reader.
- Insert fully; reader controls assay start.

### Leak prevention mechanism
- Recessed comb reduces external droplet carry.
- Enclosed chamber prevents free-surface slosh.
- Narrow neck + capillary stop limits gravity leakage.
- Optional hydrophobic exterior ring near tip.

### Plastic injection molding feasibility
- Strong feasibility with 2-shell molded body.
- Comb microfeatures via hardened insert tooling.
- Ultrasonic weld seam preferred for hermetic channel closure.

---

## Concept #7 — Siphon-Primed Metering Pocket

### Internal cross-section structure
- Intake well at dipped tip.
- U-shaped siphon: ascent to crest then descent to metering pocket.
- Metering pocket isolated from direct tip exposure.
- Intentional siphon-break cavity for de-priming after removal.
- Restrictive outlet throat to LFA interface.

### Capillary flow path
1. Intake wets and primes siphon crest.
2. Primed siphon draws liquid into metering pocket.
3. Pocket reaches target fill.
4. Removal introduces air at break feature and stops draw.
5. Reader insertion enables outlet transfer to LFA pad.

### Reservoir size estimation (~120 µL)
- Active pocket target = 120 mm³.
- Example: 15.0 mm × 8.0 mm × 1.0 mm = 120 mm³.
- Add non-delivered dead-volume allowance in siphon/throat (10–20 µL structural).

### User handling behavior
- Requires minimum dip depth to prime (dip line critical).
- Slightly longer dwell may be needed versus direct capillary designs.
- No manual actuation after dip.

### Leak prevention mechanism
- Siphon-break halts continued intake after removal.
- Enclosed pocket plus high-resistance outlet suppresses drips.
- Internal anti-slosh ribs reduce surge leakage during walking.

### Plastic injection molding feasibility
- Feasible with split-channel architecture across two halves.
- Tighter tolerance needed at crest/break geometry than concept #6.
- Thermoplastic-only implementation possible (no elastomer mandatory).

---

## Concept #8 — Capillary Ring Collector

### Internal cross-section structure
- Annular intake groove around perimeter of dip tip.
- Radial feeder microchannels to central metering core.
- Enclosed central reservoir.
- Vent chimney with splash labyrinth.
- Controlled outlet port aligned with LFA pad.

### Capillary flow path
1. Ring wets circumferentially on dip.
2. Radial channels pull inward uniformly.
3. Central reservoir fills; air exits via vent.
4. Capillary stop arrests fill.
5. Reader insertion couples outlet to LFA pad for transfer.

### Reservoir size estimation (~120 µL)
- Central reservoir target: 120 mm³.
- Circular option: dia 11.5 mm, height 1.15 mm ⇒ ~119.4 mm³.
- Rectangular option: 11.0 mm × 10.0 mm × 1.1 mm ⇒ 121 mm³.

### User handling behavior
- Most orientation-tolerant during dip.
- Visible ring wetting offers intuitive “collecting” cue.
- No extra post-dip action.

### Leak prevention mechanism
- Ring drains inward, minimizing outer-surface droplets.
- Anti-drip lip can be integrated at perimeter edge.
- Enclosed core and narrow outlet reduce shake-out.

### Plastic injection molding feasibility
- Highly moldable in flat geometry with symmetric channels.
- Strong repeatability due to radial symmetry.
- Compatible with high-speed assembly and ultrasonic closure.

---

## Concept #9 — Sliding Gate Metering Tip

### Internal cross-section structure
- Tip inlet window connected to metering chamber.
- Sliding gate (lateral/axial) with open/closed detents.
- Guide rails integrated in housing.
- Optional dual seal: inlet seal and delayed outlet opening.
- Transfer channel to LFA pad downstream.

### Capillary flow path
1. User sets gate open.
2. Dip fills chamber capillarily.
3. User slides gate closed, mechanically isolating intake.
4. Reader insertion enables outlet transfer (passive or reader-actuated).

### Reservoir size estimation (~120 µL)
- Net free chamber volume target: ~120 mm³.
- Example base geometry: 13.3 mm × 9.0 mm × 1.0 mm = 119.7 mm³.
- If gate intrudes volume, compensate in planform area to preserve net capacity.

### User handling behavior
- One additional explicit action: “slide to lock.”
- Binary state can be color-coded (OPEN/LOCK).
- Strongly controlled transport behavior after lock.

### Leak prevention mechanism
- Positive mechanical closure is best anti-drip strategy of the four.
- Detents prevent accidental re-opening.
- Optional wiper edge strips residual liquid at inlet face.

### Plastic injection molding feasibility
- Feasible but highest complexity among #6–#9.
- Requires tolerance control for sliding friction and seal reliability.
- Material pairing (e.g., PP housing + POM slider) improves actuation feel.
- Adds assembly stations but remains scalable.

---

## 4) LFA mechanism design integration

### 4.1 Common strip-interface architecture
For all concepts, a robust interface stack is recommended:
- Metered reservoir outlet
- Short flow resistor neck (microchannel)
- LFA sample pad contact zone
- Optional vented air escape path near strip entrance

### 4.2 Transfer behavior targets
- Avoid sudden bolus dump that can flood conjugate zone.
- Maintain consistent front velocity from sample pad into strip.
- Isolate user-dependent collection variability from strip kinetics.

### 4.3 Concept-specific strip interaction summary
- **#6 Comb:** Fast uptake, moderate orientation sensitivity, good strip feed with neck resistor.
- **#7 Siphon:** Better isolation of collection dynamics; sensitive to priming geometry.
- **#8 Ring:** Best orientation tolerance; stable feed if outlet resistor tuned.
- **#9 Sliding gate:** Strongest timing isolation; best for reader-synchronized transfer.

---

## 5) Engineering validation plan

### 5.1 Bench metering tests
- Gravimetric fill validation (n≥60/variant) at 15°C, 25°C, 35°C.
- Dip depth/time DOE: shallow/nominal/deep × short/nominal/long dwell.
- Acceptance starting point: mean 120 µL ±10 µL, CV ≤8% (to be tuned by assay needs).

### 5.2 Transport/leak tests
- 60-second carry simulation with walking motion profile.
- Shake and inversion challenge after fill.
- External droplet scoring at tip and body.

### 5.3 LFA transfer/assay coupling tests
- Time-to-strip-wet-front metrics at fixed insertion force.
- Band intensity repeatability vs collected volume scatter.
- Invalid-rate mapping vs overfill/underfill conditions.

### 5.4 Manufacturing validation
- Mold capability study on key microfeatures (Cpk on channel width/height).
- Weld integrity burst/leak test.
- Slider durability cycle test for concept #9.

### 5.5 Recommended prototype sequence
1. EVT: #6 and #8 passive concepts first (speed and low complexity).
2. Parallel risk prototype: #9 anti-drip control track.
3. DVT convergence based on leak + assay repeatability results.

---

## 6) Risk analysis

### 6.1 FMEA-style top risks by concept

#### Concept #6 (Capillary Comb)
- **Risk:** tine clogging by debris/bubbles.
- **Effect:** underfill variability.
- **Mitigation:** wider manifold throat, redundant tine count, filtration lip.

#### Concept #7 (Siphon)
- **Risk:** inconsistent priming at low dip depth.
- **Effect:** no-fill or delayed-fill events.
- **Mitigation:** clear dip-depth mark, crest geometry tuning, priming indicator.

#### Concept #8 (Ring)
- **Risk:** perimeter contamination or partial ring blockage.
- **Effect:** asymmetric fill or slower fill.
- **Mitigation:** multi-radial feeders + larger ring hydraulic redundancy.

#### Concept #9 (Sliding Gate)
- **Risk:** user forgets to lock or lock mis-engagement.
- **Effect:** leakage during transport.
- **Mitigation:** high-contrast lock state, audible click detent, reader interlock that checks lock state.

### 6.2 Cross-concept manufacturing risks
- Microchannel flash/burr alters capillary pressure.
- Surface-energy drift across lots changes wetting.
- Weld variation creates internal leak paths.

### 6.3 Cross-concept mitigation controls
- Inline machine vision for microfeature integrity.
- Surface treatment process controls and periodic contact-angle QA.
- 100% leak test at submersion/pressure differential (as practical).

### 6.4 Down-selection recommendation (current)
- **Primary passive candidate:** **Concept #8** (best UX tolerance + low complexity).
- **Secondary passive candidate:** **Concept #6** (simple, quick fill, robust tooling path).
- **Controlled premium path:** **Concept #9** for maximum anti-drip robustness where added mechanism cost is acceptable.
- **Conditional candidate:** **Concept #7** if priming robustness is proven in EVT.


---

## 7) Comparative scoring and recommendation (Concepts #6, #7, #8, #9)

### 7.1 Scoring rubric
- **Scale:** 1 (poor) to 10 (excellent).
- **Dimensions:**
  1. Urine metering accuracy (~120 µL)
  2. Leakage risk during transport
  3. User interaction complexity (higher score = simpler UX)
  4. Injection molding feasibility
  5. Risk of LFA strip wetting errors (higher score = lower risk)

### 7.2 Scorecard

| Concept | Metering accuracy | Leakage resistance | UX simplicity | Molding feasibility | LFA wetting robustness | Total (/50) |
|---|---:|---:|---:|---:|---:|---:|
| #6 Capillary Comb Tip | 8 | 7 | 8 | 8 | 8 | **39** |
| #7 Siphon-Primed Pocket | 7 | 8 | 6 | 7 | 7 | **35** |
| #8 Capillary Ring Collector | 9 | 8 | 9 | 9 | 9 | **44** |
| #9 Sliding Gate Metering Tip | 8 | 9 | 6 | 6 | 8 | **37** |

### 7.3 Rationale by concept

#### Concept #6 — Capillary Comb Tip
1. **Metering accuracy: 8/10**  
   Good due to multi-inlet averaging + fixed chamber, but can drift if tine wetting is non-uniform.
2. **Leakage resistance: 7/10**  
   Enclosed chamber and capillary stop help, but no hard mechanical shutoff.
3. **UX simplicity: 8/10**  
   Passive dip-and-insert with minimal extra steps.
4. **Molding feasibility: 8/10**  
   Good 2-shell architecture; tine precision and tool wear must be managed.
5. **LFA wetting robustness: 8/10**  
   Stable if transfer neck resistance is tuned.

#### Concept #7 — Siphon-Primed Metering Pocket
1. **Metering accuracy: 7/10**  
   Potentially strong once primed, but priming sensitivity can create no-fill/underfill tails.
2. **Leakage resistance: 8/10**  
   Siphon-break and enclosed pocket improve transport behavior.
3. **UX simplicity: 6/10**  
   Minimum dip depth and possible longer dwell increase use error opportunity.
4. **Molding feasibility: 7/10**  
   Feasible, but crest and break geometry tolerances are tighter.
5. **LFA wetting robustness: 7/10**  
   Good buffering effect, but priming variability can propagate to strip wetting variability.

#### Concept #8 — Capillary Ring Collector
1. **Metering accuracy: 9/10**  
   Best orientation tolerance during collection and stable central metering cavity.
2. **Leakage resistance: 8/10**  
   Inward drainage and enclosed core reduce drip risk.
3. **UX simplicity: 9/10**  
   Most intuitive passive behavior; insensitive to angle.
4. **Molding feasibility: 9/10**  
   Symmetric microfeatures, straightforward tooling strategy, high repeatability.
5. **LFA wetting robustness: 9/10**  
   Decoupled collection and controlled outlet give the strongest wet-front consistency.

#### Concept #9 — Sliding Gate Metering Tip
1. **Metering accuracy: 8/10**  
   Fixed chamber gives good metering; intrusion by slider must be compensated.
2. **Leakage resistance: 9/10**  
   Best transport control due to positive mechanical shutoff.
3. **UX simplicity: 6/10**  
   Extra user action (lock step) adds cognitive and execution burden.
4. **Molding feasibility: 6/10**  
   Most complex mechanism; tight tolerances and added assembly burden.
5. **LFA wetting robustness: 8/10**  
   Strong timing control if gate logic and reader interaction are robust.

### 7.4 Recommended concept
- **Recommended primary concept: #8 (Capillary Ring Collector).**
  - Highest total score (**44/50**).
  - Best balance across metering precision, user simplicity, manufacturability, and LFA consistency.
  - Strong passive architecture lowers training burden and scale-up risk.

### 7.5 Practical development strategy
- Advance **#8 as primary EVT path**.
- Keep **#9 as a risk-mitigation parallel track** if leakage requirements become stricter than passive designs can satisfy.
- Maintain **#6 as backup passive architecture** if ring tooling or contamination edge-cases emerge.


---

## 8) Parametric structural layout — Concept #9 (Sliding Gate Metering Tip)

### 8.1 Engineering description
Concept #9 is a **flat metered cavity + mechanical isolation** architecture. The sample is collected capillarily through a tip inlet while the slider is in OPEN state; user then moves slider to LOCK, which physically isolates the inlet (and optionally delays outlet). During reader insertion, the LFA interface couples at a controlled contact plane so sample transfer begins only after full seating.

Core subsystems:
1. **Cross-section stack**: top shell + channel core + bottom shell (overall thickness under 5.5 mm).
2. **Metering reservoir**: fixed cavity near 120 mm³ net free volume.
3. **Inlet block**: recessed capillary entry slit + anti-drip lip.
4. **Slider module**: lateral gate with guide rails and OPEN/LOCK detents.
5. **LFA interface**: outlet neck and sample-pad contact land at insertion end.

### 8.2 Parametric cross-section geometry (dimension estimates)
All values are initial estimates for EVT and should be tolerance-optimized during DFM.

#### Global envelope
- Stick width: **17.89 mm** (fixed).
- Max thickness: **5.5 mm** (fixed).
- Proposed total thickness allocation:
  - Top shell: 1.2 mm
  - Fluidic core height: 1.0–1.2 mm
  - Bottom shell: 1.2 mm
  - Slider pocket / structural ribs / clearances: remainder (~1.9–2.1 mm distributed)

#### Metering reservoir (~120 µL)
- Target net free volume: **120 mm³ (120 µL)**.
- Parametric form: rectangular cavity with rounded corners.
- Baseline geometry option A:
  - Length (Lr): **13.3 mm**
  - Width (Wr): **9.0 mm**
  - Height (Hr): **1.0 mm**
  - Volume: ~119.7 mm³
- Geometry option B (if slider intrusion reduces free volume):
  - Lr: **14.0 mm**, Wr: **9.0 mm**, Hr: **1.0 mm**
  - Volume: ~126 mm³ gross; tune with capillary stop to net ~120 µL delivered.

#### Inlet geometry
- Recessed intake window width: **4.0–5.0 mm**.
- Primary capillary slit height: **0.25–0.40 mm**.
- Inlet lead channel:
  - Length: **2.5–4.0 mm**
  - Width: **0.5–0.8 mm**
  - Height: **0.30–0.50 mm**
- Anti-drip lip overhang: **0.3–0.5 mm** at tip perimeter.

#### Slider mechanism layout
- Slider travel (Ts): **2.5–3.5 mm** lateral stroke.
- Rail width: **0.8–1.2 mm** each side.
- Detent depth: **0.2–0.4 mm** with two stable positions (OPEN, LOCK).
- Gate overlap over inlet in LOCK: **≥0.8 mm** sealing overlap.
- Optional secondary outlet gate overlap: **0.5–0.8 mm**.
- Manual actuation pad: textured thumb zone ~**5 × 4 mm**.

#### LFA strip interface
- Outlet neck cross-section:
  - Width: **0.6–1.0 mm**
  - Height: **0.20–0.40 mm**
  - Length: **2.0–4.0 mm** (acts as flow resistor)
- Contact land at strip pad: **2.0–3.0 mm** long planar datum.
- Alignment feature: 1 hard-stop shoulder + 2 lateral keys to avoid pad misregistration.

### 8.3 Simplified schematic (not to scale)

#### A) Top view (fluidic + slider concept)
```text
Tip / Dip End                                                Reader End
┌─────────────────────────────────────────────────────────────────────────┐
│ [Inlet window]──[Lead channel]──────┌──────── Reservoir ────────┐      │
│     ▲              ▲                │                            │      │
│  slider gate       │                │        ~120 µL            │──┐   │
│  closes here       │                │                            │  │   │
│  in LOCK           │                └────────────────────────────┘  │   │
│                     └────── OPEN/LOCK slider travel (2.5–3.5 mm) ───┘   │
│                                                        [Outlet neck]→LFA │
└─────────────────────────────────────────────────────────────────────────┘
```

#### B) Cross-section (through inlet + reservoir + outlet)
```text
                Top shell
        ┌───────────────────────────┐
        │   Slider pocket / rails   │
Tip     │ ┌────Gate────┐            │          Reader
side    │ │ OPEN/LOCK  │            │          side
→        │ └────┬──────┘            │
        │      [Inlet slit]         │
        │         │                 │
        │   ┌─────▼────────────┐    │
        │   │ Metering cavity  │────┼──▶ Outlet neck to LFA pad
        │   │  (~120 mm³)      │    │
        │   └──────────────────┘    │
        └───────────────────────────┘
               Bottom shell
```

### 8.4 Design intent notes
- Keep fluidic cavity and slider mechanics **functionally decoupled** except at gate interface to reduce tolerance stack sensitivity.
- Prioritize a strong LOCK confirmation (audible click + visual indicator) to minimize misuse.
- Tune outlet neck hydraulic resistance with strip lot variability to avoid early flooding or delayed wetting.
- Use this parametric layout as a starting point for CAD + CFD + mold-flow co-optimization.
