// Side button redesign for a proof-of-concept LFA urine stick housing.
// Units: millimeters.
// Goal: simple prototype that assembles easily and lets only the side button move.
// Open in OpenSCAD, then set `show_part` to choose the printable part.

show_part = "assembly"; // assembly, button, housing_section, pcb_fixture, travel_gauge

// --- Key dimensions to tune after measuring the real tact switch and shell ---
button_length = 22.0;
button_height = 9.0;
button_visible_thickness = 2.4;
corner_radius = 1.8;

housing_wall = 1.8;
window_clearance = 0.35;
window_length = button_length + 0.8;
window_height = button_height + 0.8;

// Button travel is intentionally short for a tact switch.
press_travel = 0.9;
preload_gap = 0.2;
plunger_length = 6.2;
plunger_width = 4.0;
plunger_height = 3.2;

// Retention ears keep the button captive behind the shell window.
ear_length = 4.2;
ear_height = 2.0;
ear_thickness = 1.1;
ear_overlap = 1.0;

// Guide rails stop rocking so only the center plunger presses the switch.
rail_length = 15.5;
rail_height = 1.4;
rail_width = 1.0;
rail_gap = 6.3;
rail_clearance = 0.25;

// Tact switch placeholder from the supplied CAD screenshot.
switch_body = [6.0, 6.0, 3.5];
switch_button_diameter = 3.0;
switch_button_height = 1.0;

$fn = 36;

module rounded_box(size, r) {
    x = size[0];
    y = size[1];
    z = size[2];
    hull() {
        for (px = [-x / 2 + r, x / 2 - r])
            for (py = [-y / 2 + r, y / 2 - r])
                translate([px, py, 0]) cylinder(h = z, r = r, center = true);
    }
}

module side_button() {
    union() {
        // Exterior thumb pad: slightly proud and rounded for easy pressing.
        translate([0, 0, 0])
            rounded_box([button_length, button_height, button_visible_thickness], corner_radius);

        // Rear retention ears. They pass through the shell window and catch inside the wall.
        for (xsign = [-1, 1])
            translate([xsign * (button_length / 2 - ear_length / 2), 0, -(button_visible_thickness + ear_thickness) / 2])
                rounded_box([ear_length, button_height + 2 * ear_overlap, ear_thickness], 0.7);

        // Two guide ribs slide in matching channels in the housing boss.
        for (ysign = [-1, 1])
            translate([0, ysign * rail_gap / 2, -(button_visible_thickness / 2 + 1.0)])
                rounded_box([rail_length, rail_width, rail_height], 0.35);

        // Center plunger contacts only the tact switch actuator.
        translate([0, 0, -(button_visible_thickness / 2 + plunger_length / 2)])
            rounded_box([plunger_width, plunger_height, plunger_length], 0.45);
    }
}

module housing_section() {
    difference() {
        union() {
            // Local shell sample around the side opening.
            translate([0, 0, 0]) rounded_box([34, 18, housing_wall], 2.8);

            // Internal boss with rails and hard stops, printed as part of the housing.
            translate([0, 0, -(housing_wall / 2 + 1.2)])
                rounded_box([27, 13, 2.4], 1.6);
        }

        // Side window with clearance around the moving button pad.
        translate([0, 0, 0])
            rounded_box([window_length, window_height, housing_wall + 0.6], corner_radius + 0.25);

        // Rail channels. Clearance prevents the button from binding.
        for (ysign = [-1, 1])
            translate([0, ysign * rail_gap / 2, -(housing_wall / 2 + 1.2)])
                rounded_box([rail_length + 1.0, rail_width + 2 * rail_clearance, 2.8], 0.45);

        // Plunger tunnel aimed at the tact switch.
        translate([0, 0, -2.5])
            rounded_box([plunger_width + 0.6, plunger_height + 0.6, 5.2], 0.55);
    }

    // Four internal stop pads set maximum travel and stop the button from hitting the PCB.
    for (xsign = [-1, 1])
        for (ysign = [-1, 1])
            translate([xsign * 8.2, ysign * 4.2, -(housing_wall / 2 + 2.8)])
                rounded_box([2.6, 1.8, 0.9], 0.35);
}

module tact_switch_placeholder() {
    color("dimgray") translate([0, 0, 0]) cube(switch_body, center = true);
    color("black") translate([0, 0, switch_body[2] / 2 + switch_button_height / 2])
        cylinder(h = switch_button_height, d = switch_button_diameter, center = true);
}

module pcb_fixture() {
    color("limegreen") translate([0, 0, -10.0]) cube([44, 18, 1.2], center = true);
    translate([0, 0, -7.65]) tact_switch_placeholder();
}

module travel_gauge() {
    // Simple printable gauge: left gap is preload, right gap is total allowed travel.
    difference() {
        rounded_box([28, 10, 2], 1.0);
        translate([-7, 0, 0]) cube([preload_gap, 8, 3], center = true);
        translate([7, 0, 0]) cube([press_travel, 8, 3], center = true);
    }
}

module assembly() {
    color("lightgray") housing_section();
    color("slategray") translate([0, 0, housing_wall / 2 + button_visible_thickness / 2 + 0.05]) side_button();
    pcb_fixture();
}

if (show_part == "button") {
    side_button();
} else if (show_part == "housing_section") {
    housing_section();
} else if (show_part == "pcb_fixture") {
    pcb_fixture();
} else if (show_part == "travel_gauge") {
    travel_gauge();
} else {
    assembly();
}
