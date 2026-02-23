# Method Integrity Smoke Report

- YAML methods: 47
- DB methods: 47
- Failures: 0

| method_id | stage | artifact_type | required_knobs | status | notes |
|---|---|---|---|---|---|
| M-CAL-001 | CALIBRATE | notes | confidence_scale, item_count, max_duration_min | WARN | missing_knobs:confidence_scale,item_count,max_duration_min |
| M-CAL-002 | CALIBRATE | notes | confidence_scale, miscalibration_threshold | WARN | missing_knobs:confidence_scale,miscalibration_threshold |
| M-CAL-003 | CALIBRATE | notes | top_k, weighting_profile | WARN | missing_knobs:top_k,weighting_profile |
| M-ENC-001 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-002 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-003 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-004 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-005 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-006 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-007 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-008 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-009 | ENCODE | concept-map | diagram_format | WARN | missing_knobs:diagram_format |
| M-ENC-010 | ENCODE | table | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-011 | ENCODE | flowchart | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-012 | ENCODE | decision-tree | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-013 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-ENC-014 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-INT-001 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-INT-002 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-INT-003 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-INT-004 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-INT-005 | RETRIEVE | notes | guidance_level | WARN | missing_knobs:guidance_level |
| M-INT-006 | ENCODE | notes | guidance_level, output_format | WARN | missing_knobs:guidance_level,output_format |
| M-OVR-001 | OVERLEARN | notes | intensity, speed_pressure | WARN | missing_knobs:intensity,speed_pressure |
| M-OVR-002 | OVERLEARN | cards | intensity, speed_pressure | WARN | missing_knobs:intensity,speed_pressure |
| M-OVR-003 | OVERLEARN | notes | intensity, speed_pressure | WARN | missing_knobs:intensity,speed_pressure |
| M-PRE-001 | PRIME | notes | feedback_style | WARN | missing_knobs:feedback_style |
| M-PRE-002 | PRIME | notes | guidance_level, priming_scope | WARN | missing_knobs:guidance_level,priming_scope |
| M-PRE-003 | PRIME | notes | guidance_level, priming_scope | WARN | missing_knobs:guidance_level,priming_scope |
| M-PRE-004 | PRIME | notes | complexity_level, representation_format | WARN | missing_knobs:complexity_level,representation_format |
| M-PRE-005 | PRIME | concept-map | map_format, node_count_cap | WARN | missing_knobs:map_format,node_count_cap |
| M-PRE-006 | PRIME | notes | output_mode, pillar_count | WARN | missing_knobs:output_mode,pillar_count |
| M-PRE-007 | CALIBRATE | notes | confidence_scale, probe_count | WARN | missing_knobs:confidence_scale,probe_count |
| M-PRE-008 | PRIME | notes | node_cap, objective_link_required, output_format, priming_depth_mode | WARN | missing_knobs:node_cap,objective_link_required,output_format,priming_depth_mode |
| M-PRE-009 | PRIME | notes | source_cap, synthesis_format | WARN | missing_knobs:source_cap,synthesis_format |
| M-PRE-010 | PRIME | notes | cognitive_depth, delivery_style, objective_scope | WARN | missing_knobs:cognitive_depth,delivery_style,objective_scope |
| M-REF-001 | REFERENCE | notes | artifact_depth, link_density | WARN | missing_knobs:artifact_depth,link_density |
| M-REF-002 | REFERENCE | notes | artifact_depth, link_density | WARN | missing_knobs:artifact_depth,link_density |
| M-REF-003 | REFERENCE | outline | artifact_depth, link_density | WARN | missing_knobs:artifact_depth,link_density |
| M-REF-004 | REFERENCE | outline | artifact_depth, link_density | WARN | missing_knobs:artifact_depth,link_density |
| M-RET-001 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-RET-002 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-RET-003 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-RET-004 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-RET-005 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-RET-006 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |
| M-RET-007 | RETRIEVE | notes | difficulty, feedback_timing | WARN | missing_knobs:difficulty,feedback_timing |

