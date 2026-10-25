# Frontend Architecture Specification

## 1. Design & Layout Hierarchy
- **Typography**: Space Grotesk (sans), Newsreader (editorial serif), Space Mono (tabular technical metadata).
- **Film Grain Shader**: Procedural animated SVG noise filter overlay (`.grain`).
- **Diagonal Avatar Arc (`A24HealthcareStage.tsx`)**:
  - Positions the 4 agent avatars along a diagonal 3D perspective path mimicking the A24 CD disc trajectory.
  - Scale and opacity dynamically compute based on offset from `focusedIndex`.
- **Slide-Over Workspace Drawer (`AgentWorkspaceDrawer.tsx`)**:
  - Smooth 0.65s cubic-bezier transition sliding in from the right (`56vw`).
  - Stage shifts left (`44vw`) to maintain centered focus on the active avatar.
  - Tabs:
    1. **01 // TELEMETRY & CHAT**: Real-time SSE streaming, tool result rendering (Doctor cards, GCal badges).
    2. **02 // LAB BIOMARKERS**: Drag-and-drop report upload and structured biomarker status table.
    3. **03 // RX & KINESIS**: Pharmacology supplement schedule and 7-day kinesiology split.
    4. **04 // DOCTOR & GCAL**: OpenStreetMap nearby specialist radar and 1-click autonomous booking.
