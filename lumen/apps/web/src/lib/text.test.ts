import { describe, expect, it } from "vitest";
import { titleCase } from "./text";

describe("titleCase", () => {
  it.each([
    ["Good morning, Juan", "Good Morning, Juan"],
    ["Report an issue", "Report an Issue"],
    ["Map of reports in Pasig City", "Map of Reports in Pasig City"],
    ["What happens next", "What Happens Next"],
    ["Is it really fixed?", "Is It Really Fixed?"],
    ["Sign In to PKonek", "Sign In to PKonek"],
    ["Check and send", "Check and Send"],
    ["Yes, it's fixed", "Yes, It's Fixed"],
    ["Step 2: where is it", "Step 2: Where Is It"],
    ["follow-up visit", "Follow-Up Visit"],
    ["Go to", "Go To"],
  ])("%s -> %s", (input, output) => {
    expect(titleCase(input)).toBe(output);
  });

  it("never lowers letters, so codes keep their casing (names must not be passed in)", () => {
    expect(titleCase("Track PSG-2026-000123")).toBe("Track PSG-2026-000123");
    expect(titleCase("Me Too")).toBe("Me Too");
    expect(titleCase("Juan dela Cruz")).toBe("Juan Dela Cruz");
    expect(titleCase("(planned)")).toBe("(Planned)");
  });

  it("keeps spacing", () => {
    expect(titleCase("  two  spaces ")).toBe("  Two  Spaces ");
  });
});
