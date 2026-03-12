# LFA AI Lab Concept Evaluation Report

## Project Summary
Device-specific screening for dip-based urine LFA stick concepts. Scoring is heuristic for early design decisions only.

## Concise Ranking Table

| Rank | Concept | Retained Volume (uL) | Total Score | Recommendation |
|---:|---|---:|---:|---|
| 1 | Metering Chamber + Overflow | 122 | 30.6 | prototype |
| 2 | Capillary Grid + Pad Transfer | 118 | 24.7 | discard |
| 3 | Rib Reservoir + Drip Trap | 112 | 24.3 | discard |

## Engineering Review by Concept

### Rank #1: Metering Chamber + Overflow

**Summary:** Fixed metering cavity with controlled overflow return for more repeatable retained volume.

**Mechanism:** Dip fills a defined chamber. Excess sample exits through an overflow path while a vent path supports stable fill. Chamber outlet contacts LFA transfer zone.

**Assumed retained volume (uL):** 122
**Overflow strategy:** Dedicated overflow trench with return drain
**Vent strategy:** Top-side vent notch near chamber roof
**Transfer interface:** Direct chamber outlet to absorbent transfer pad

**Criterion scores**
- metering_accuracy: 5.0
- moldability: 4.0
- bubble_robustness: 4.0
- carry_stability: 4.0
- transfer_quality: 5.0
- ux_clarity: 4.0
- total_weighted_score: 30.6

**Gating flag summary**
- needs_vent: yes
- overflow_control_present: yes
- likely_bubble_trap: no
- high_molding_risk: no
- transfer_interface_defined: yes

**Likely failure modes**
- Vent notch partially blocked by molding flash
- Overflow trench retains droplets after carry
- Chamber outlet wets unevenly at low dip depth

**Top 3 prototype tests**
- Retained-volume repeatability across dip angle and dwell time
- Carry leakage test after 30 to 120 second delay
- Transfer completeness into pad across temperature range

**Top 3 next experiments**
- Retained-volume repeatability across dip angle and dwell time
- Carry leakage test after 30 to 120 second delay
- Transfer completeness into pad across temperature range

**Recommendation:** prototype

### Rank #2: Capillary Grid + Pad Transfer

**Summary:** Micro-grid capillary intake feeding a transfer pad for smoother delivery.

**Mechanism:** Grid cells prime during dip. Filled grid contacts a transfer pad that then supplies the LFA membrane over a short flow window.

**Assumed retained volume (uL):** 118
**Overflow strategy:** No explicit overflow feature; excess relies on capillary saturation limit
**Vent strategy:** Distributed micro-vents between grid lanes
**Transfer interface:** Grid-to-pad compression interface

**Criterion scores**
- metering_accuracy: 4.0
- moldability: 3.0
- bubble_robustness: 3.0
- carry_stability: 3.0
- transfer_quality: 4.0
- ux_clarity: 4.0
- total_weighted_score: 24.7

**Gating flag summary**
- needs_vent: yes
- overflow_control_present: no
- likely_bubble_trap: yes
- high_molding_risk: yes
- transfer_interface_defined: yes

**Likely failure modes**
- Partial priming of grid cells reduces delivered volume
- Bubble pockets remain in corners of micro-grid
- Compression mismatch causes uneven release into pad

**Top 3 prototype tests**
- Bubble sensitivity test with repeated dip cycles
- Micro-feature replication check across tooling lots
- Pad-contact pressure sweep for transfer consistency

**Top 3 next experiments**
- Bubble sensitivity test with repeated dip cycles
- Micro-feature replication check across tooling lots
- Pad-contact pressure sweep for transfer consistency

**Recommendation:** discard

### Rank #3: Rib Reservoir + Drip Trap

**Summary:** Shallow rib channels retain sample with a drip trap to reduce hanging droplets.

**Mechanism:** Sample is retained between ribs during dip. A downstream pocket captures larger droplets before insertion and then feeds transfer region.

**Assumed retained volume (uL):** 112
**Overflow strategy:** Passive spill-back over rib tops (no dedicated overflow channel)
**Vent strategy:** Open side vents along rib array
**Transfer interface:** Rib outlets converge into a small transfer wick

**Criterion scores**
- metering_accuracy: 3.0
- moldability: 4.0
- bubble_robustness: 3.0
- carry_stability: 4.0
- transfer_quality: 3.0
- ux_clarity: 4.0
- total_weighted_score: 24.3

**Gating flag summary**
- needs_vent: yes
- overflow_control_present: no
- likely_bubble_trap: yes
- high_molding_risk: no
- transfer_interface_defined: yes

**Likely failure modes**
- Uneven wetting between ribs causes low retained volume
- Drip trap overfills after long dip and leaks during carry
- Orientation-sensitive transfer from rib array to wick

**Top 3 prototype tests**
- Carry stability test under tilt and shake motions
- Retained-volume distribution across short and long dips
- Transfer timing test in horizontal vs vertical orientation

**Top 3 next experiments**
- Carry stability test under tilt and shake motions
- Retained-volume distribution across short and long dips
- Transfer timing test in horizontal vs vertical orientation

**Recommendation:** discard
