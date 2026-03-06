"""
G-code generator for bioprinting.

Produces a minimal, valid G-code file suitable for bioprinter firmware
(Marlin-compatible, RepRap dialect).

TECH DEBT:
- Extrusion paths are simple back-and-forth rasters — no contour or infill strategy.
- Pressure/flow control uses a single E-axis proxy — real bioprinters need
  pneumatic pressure commands (e.g. M-code extensions) specific to the firmware.
- No temperature ramping, no tool-change sequences for multi-material.
"""
from pathlib import Path
from typing import Any

_FEED_RATE_DEFAULT = 1200   # mm/min
_TRAVEL_SPEED = 3000        # mm/min
_RETRACT_MM = 0.5


def generate_gcode(slice_data: dict[str, Any], output_path: Path) -> dict[str, Any]:
    """
    Generate G-code from slice data and write to output_path.

    Returns metadata: line_count, estimated_print_time_s, artifact_filename.
    """
    lines: list[str] = []
    total_time_s = 0.0

    _header(lines)

    prev_material_id = None
    for layer in slice_data["layers"]:
        idx = layer["index"]
        z = layer["z_top_mm"]
        width = layer["width_mm"]
        depth = layer["depth_mm"]
        speed = layer.get("extrusion_speed_mmps") or 20.0  # mm/s default
        feed = int(speed * 60)

        # Tool change comment if material switches
        if layer.get("material_id") != prev_material_id:
            mid = layer.get("material_id", "unassigned")
            lines.append(f"; --- Switch to material_id={mid} ---")
            prev_material_id = layer.get("material_id")

        lines.append(f"; Layer {idx}  Z={z} mm")
        lines.append(f"G0 Z{z:.3f} F{_TRAVEL_SPEED}  ; lift to layer")
        lines.append(f"G0 X0.000 Y0.000 F{_TRAVEL_SPEED}  ; home XY")

        # Simple raster scan: horizontal lines across width, stepping in Y
        y_step = 0.4   # raster line spacing mm
        y = 0.0
        e = 0.0        # extrusion accumulator (proxy for pressure)
        direction = 1
        while y <= depth:
            x_end = width if direction == 1 else 0.0
            extrude_len = width * 0.02   # arbitrary E proxy
            e += extrude_len
            lines.append(
                f"G1 X{x_end:.3f} Y{y:.3f} E{e:.4f} F{feed}  ; raster"
            )
            y += y_step
            direction *= -1
            # Time estimate: distance / speed
            total_time_s += width / speed

        # Retract
        e -= _RETRACT_MM
        lines.append(f"G1 E{e:.4f} F2400  ; retract")

    _footer(lines)

    output_path.write_text("\n".join(lines))
    return {
        "line_count": len(lines),
        "estimated_print_time_s": round(total_time_s, 1),
        "artifact_filename": output_path.name,
    }


def _header(lines: list[str]) -> None:
    lines += [
        "; BioPrint generated G-code",
        "; DO NOT modify without re-validating compliance documentation",
        "G21        ; set units to millimetres",
        "G90        ; absolute positioning",
        "M82        ; absolute extrusion",
        "G28        ; home all axes",
        "G92 E0     ; reset extruder",
        "",
    ]


def _footer(lines: list[str]) -> None:
    lines += [
        "",
        "G0 Z10 F3000  ; lift nozzle",
        "G28 X Y       ; home XY",
        "M84           ; disable motors",
        "; END OF PRINT",
    ]
