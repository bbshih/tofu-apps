/**
 * Utility functions for managing dynamic meta tags for SEO and link previews
 */

interface MetaTagsConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

/**
 * Update meta tags dynamically for better link previews
 */
export function updateMetaTags(config: MetaTagsConfig) {
  const { title, description, image, url } = config;

  // Update document title
  document.title = title;

  // Helper to update or create meta tag
  const updateMeta = (property: string, content: string) => {
    let tag =
      document.querySelector(`meta[property="${property}"]`) ||
      document.querySelector(`meta[name="${property}"]`);

    if (!tag) {
      tag = document.createElement("meta");
      if (property.startsWith("og:") || property.startsWith("twitter:")) {
        tag.setAttribute("property", property);
      } else {
        tag.setAttribute("name", property);
      }
      document.head.appendChild(tag);
    }

    tag.setAttribute("content", content);
  };

  // Primary meta tags
  updateMeta("title", title);
  updateMeta("description", description);

  // Open Graph tags
  updateMeta("og:title", title);
  updateMeta("og:description", description);
  if (url) updateMeta("og:url", url);
  if (image) updateMeta("og:image", image);

  // Twitter tags
  updateMeta("twitter:title", title);
  updateMeta("twitter:description", description);
  if (image) updateMeta("twitter:image", image);
}

/**
 * Meta tags for voting page
 */
export function setVotingPageMeta(eventTitle: string, pollId: string) {
  updateMetaTags({
    title: `Vote: ${eventTitle} | SeaCalendar`,
    description: `Cast your vote for "${eventTitle}". Select when you're available and help find the perfect time!`,
    url: `${window.location.origin}/vote/${pollId}`,
    image: `${window.location.origin}/og-image.png`,
  });
}

/**
 * Meta tags for results page
 */
export function setResultsPageMeta(
  eventTitle: string,
  pollId: string,
  topChoice?: string,
) {
  const description = topChoice
    ? `Results for "${eventTitle}". Top choice: ${topChoice}`
    : `See the voting results for "${eventTitle}"`;

  updateMetaTags({
    title: `Results: ${eventTitle} | SeaCalendar`,
    description,
    url: `${window.location.origin}/results/${pollId}`,
    image: `${window.location.origin}/og-image.png`,
  });
}

/**
 * Reset to default meta tags
 */
export function resetMetaTags() {
  updateMetaTags({
    title: "SeaCalendar - Friend Hangout Organizer",
    description:
      "Plan hangouts with friends through Discord or web. Create events, vote on dates, and find the perfect time for everyone.",
    url: window.location.origin,
    image: `${window.location.origin}/og-image.png`,
  });
}
