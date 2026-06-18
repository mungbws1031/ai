# Side Button Redesign Notes

This redesign is based on the supplied side-button CAD screenshot. The concept is a prototype-friendly captive side button for an LFA urine stick housing, with a center plunger that presses a small tact switch on the PCB.

## Screenshot analysis

- The original layout shows a rounded rectangular side recess in the gray housing with a small side button feature aligned to a tact switch on the green PCB.
- The PCB sits close to the side wall, so the button should not float freely or rock into adjacent parts.
- The switch actuator appears to be much smaller than the side button, so the external button needs a guided center plunger.
- For a prototype, the most important requirements are easy assembly, a captive button, short travel, and preventing the plastic button from pressing anything except the tact switch.

## Redesign choices

- A single printable button part uses a rounded exterior thumb pad, two rear retention ears, two guide ribs, and one center plunger.
- The housing section uses a simple rounded side window, internal guide channels, a center plunger tunnel, and four hard-stop pads.
- The retention ears snap behind the wall after insertion from the outside, keeping the button captive without screws.
- The guide ribs constrain lateral motion and reduce rocking, so the center plunger remains aligned to the tact switch.
- The hard-stop pads define the maximum press depth before the button body can contact the PCB.

## Prototype dimensions

| Feature | Starting value |
| --- | ---: |
| Button visible pad | 22.0 mm × 9.0 mm × 2.4 mm |
| Housing window clearance | 0.35 mm per side |
| Button travel | 0.9 mm |
| Preload gap before switch contact | 0.2 mm |
| Plunger tip | 4.0 mm × 3.2 mm |
| Retention ear overlap | 1.0 mm |
| Guide rail clearance | 0.25 mm per side |

These are prototype starting values, not proof that the mechanism will work in every material or printer. Measure the actual tact switch, shell wall thickness, and PCB location, then adjust the variables at the top of `models/side_button_redesign.scad`.

## Assembly sequence

1. Print the button and housing test section.
2. Deburr the housing window and rail channels.
3. Insert the button from the outside of the shell until the rear ears pass through the window.
4. Check that the button slides smoothly and returns under the tact switch spring force.
5. Install the PCB so the tact switch actuator is centered under the plunger.
6. Press the side button and confirm that only the tact switch is actuated.

## Files

- `models/side_button_redesign.scad` contains the parametric OpenSCAD model.
- Set `show_part` to `button`, `housing_section`, `pcb_fixture`, `travel_gauge`, or `assembly` before exporting.

## Tuning checklist

- If the button binds, increase `window_clearance` or `rail_clearance` by 0.1 mm.
- If the button rattles, reduce `window_clearance` by 0.1 mm or increase retention ear overlap.
- If the switch is always pressed, increase `preload_gap` or shorten `plunger_length`.
- If the switch does not click, increase `plunger_length` or reduce the PCB-to-shell gap.
- If the button can press the PCB, increase hard-stop height or reduce `press_travel`.
