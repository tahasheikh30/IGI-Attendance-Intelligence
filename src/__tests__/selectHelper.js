import { fireEvent, screen, within } from "@testing-library/react";

/** Open a styled dropdown (components/SelectMenu.jsx) and choose the option with this text. */
export function choose(trigger, optionText) {
  fireEvent.click(trigger);
  const list = screen.getByRole("listbox");
  fireEvent.click(within(list).getByText(optionText));
}
/** The visible text of every option of a dropdown, in order. Leaves the dropdown closed. */
export function optionTexts(trigger) {
  fireEvent.click(trigger);
  const out = within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
  fireEvent.click(trigger);
  return out;
}
