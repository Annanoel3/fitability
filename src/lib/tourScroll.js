/**
 * Scrolls an element into view within its nearest scrollable ancestor.
 * Walks up the DOM tree to find the first ancestor whose overflow allows
 * scrolling and that actually has scrollable content, then scrolls just
 * enough to bring the element into view. Never scrolls the outer window.
 *
 * Used during the onboarding tour so the demo pointer stays on screen
 * even when popup content overflows on smaller phones.
 */
export function scrollIntoScrollableParent(el, padding = 16) {
  if (!el) return;
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight;
    if (canScroll) {
      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      if (elRect.top < parentRect.top + padding) {
        parent.scrollTo({
          top: parent.scrollTop - (parentRect.top + padding - elRect.top),
          behavior: "smooth",
        });
      } else if (elRect.bottom > parentRect.bottom - padding) {
        parent.scrollTo({
          top: parent.scrollTop + (elRect.bottom - parentRect.bottom + padding),
          behavior: "smooth",
        });
      }
      return;
    }
    parent = parent.parentElement;
  }
}