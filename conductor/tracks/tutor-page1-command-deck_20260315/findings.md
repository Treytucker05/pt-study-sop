# Findings: Tutor Page 1 Command Deck

## 2026-03-15

- The current Tutor shell still treats Page 1 as the old launch-first `TutorStartPanel`, shown only when Tutor mode is selected and `showSetup` is true.
- `TutorStudioMode` currently jumps straight to Studio L3 whenever `courseId` exists; Page 1 needs an explicit entry target to land on L2 class detail.
- `TutorScheduleMode` is already course-keyed and a better fit for Page 1 event-management CTAs than the global Calendar page.
- `library.tsx` already knows how to hand selected materials into Tutor, but it does not yet consume a reverse Tutor-to-Library handoff for course-scoped intake.
- `GET /api/tutor/project-shell` is course-keyed; a new aggregate endpoint is the cleanest way to back a global Page 1 command deck without frontend fan-out over every course.
- During implementation, the product IA was corrected so the command deck lives on `DashBoard` as the first shell page rather than inside the `Tutor` tab; the shipped shell now keeps `Tutor` as the live study surface only.
