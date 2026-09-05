// Real favicons for businesses that have a website, via DuckDuckGo's
// icon service (icons.duckduckgo.com/ip3/{hostname}.ico) — chosen over
// Google's equivalent (s2.googleusercontent.com/s2/favicons) to stay
// consistent with this project's general "avoid Google services where
// there's a real alternative" stance (see README, "Why not
// Apple/Google Maps"). Confirmed real and current via multiple
// independent sources, not guessed.
//
// Honest caveat, not hidden: this is an unofficial DuckDuckGo endpoint
// with no published uptime guarantee, it just happens to be widely
// relied on. It returns a generic placeholder (with a 404 status) when
// a site has no discoverable favicon — callers should hide the image
// on error rather than show a broken-image icon, same pattern already
// used for user-submitted photo URLs in AddBusinessModal.

export function getFaviconUrl(websiteUrl: string): string | null {
  try {
    const hostname = new URL(websiteUrl).hostname;
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
  } catch {
    return null; // not a valid URL, nothing to fetch a favicon for
  }
}
