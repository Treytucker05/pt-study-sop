import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The Source Shelf now opens with every folder collapsed (user preference).
 * Tests that interact with tree leaves must first expand the folders, exactly
 * as a real user now does. This clicks only collapsed folder toggles (those
 * rendering a chevron-right icon) and repeats so nested folders revealed by an
 * outer expand also open. Independent of fixture counts/labels.
 */
export async function expandAllSourceFolders(scope: HTMLElement): Promise<void> {
  const user = userEvent.setup();
  for (let pass = 0; pass < 12; pass++) {
    const collapsed = within(scope)
      .queryAllByRole("button")
      .filter((b) => {
        const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
        return (
          /\d+\/\d+ loaded/i.test(label) &&
          b.querySelector(".lucide-chevron-right") !== null
        );
      });
    if (collapsed.length === 0) break;
    for (const button of collapsed) {
      // eslint-disable-next-line no-await-in-loop
      await user.click(button);
    }
  }
}
