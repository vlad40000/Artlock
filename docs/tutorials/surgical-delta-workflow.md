# Surgical Delta Workflow

## Goal

Make a narrow, localized change while preserving the rest of the image.

## Steps

1. Complete intake and extract locks.
2. Open the workspace in `Surgical Delta` mode.
3. Confirm the correct base image is active.
4. Enter `Change #1` with the primary requested edit.
5. Optionally add `Refinements`.
6. Optionally add a `Region hint` for tighter targeting.
7. Run `Surgical Delta`.
8. Review the generated result in recent outputs.
9. Promote the result to base if it should become the new approved starting point.

## Expected Result

- The edit is limited to the requested region or detail.
- Identity, framing, and untouched areas remain stable.
- The run is recorded in output history as a surgical edit.

## Notes

- Use surgical mode for bounded changes, not broad stylistic redesigns.
- Re-lock the approved base when you want a fresh canonical lock set after major progression.
