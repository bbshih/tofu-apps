/**
 * Browser notification utilities for Calendar
 */

export type NotificationPermissionStatus = "granted" | "denied" | "default";

/**
 * Check if notifications are supported in this browser
 */
export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    console.warn("Notifications not supported in this browser");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();

    // Save preference to localStorage
    localStorage.setItem("notificationPermission", permission);

    return permission as NotificationPermissionStatus;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void },
): Notification | null {
  if (!isNotificationSupported()) {
    console.warn("Notifications not supported");
    return null;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return null;
  }

  try {
    const { onClick, ...notificationOptions } = options || {};

    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...notificationOptions,
    });

    if (onClick) {
      notification.onclick = () => {
        onClick();
        notification.close();
        window.focus(); // Bring browser window to front
      };
    }

    return notification;
  } catch (error) {
    console.error("Error showing notification:", error);
    return null;
  }
}

/**
 * Notification templates for common scenarios
 */
export const NotificationTemplates = {
  /**
   * Notify when event is created successfully
   */
  eventCreated: (eventTitle: string, eventId: string) => {
    return showNotification("Event Created! 🎉", {
      body: `"${eventTitle}" is ready for voting. Share the link with your friends!`,
      tag: `event-created-${eventId}`,
      requireInteraction: false,
      onClick: () => {
        window.location.href = `/results/${eventId}`;
      },
    });
  },

  /**
   * Notify when vote is submitted
   */
  voteSubmitted: (eventTitle: string, eventId: string) => {
    return showNotification("Vote Recorded! ✅", {
      body: `Your vote for "${eventTitle}" has been saved.`,
      tag: `vote-submitted-${eventId}`,
      requireInteraction: false,
      onClick: () => {
        window.location.href = `/results/${eventId}`;
      },
    });
  },

  /**
   * Notify about voting deadline approaching
   */
  deadlineApproaching: (
    eventTitle: string,
    eventId: string,
    hoursLeft: number,
  ) => {
    return showNotification("Voting Deadline Approaching ⏰", {
      body: `"${eventTitle}" voting ends in ${hoursLeft} hours. Make sure to vote!`,
      tag: `deadline-${eventId}`,
      requireInteraction: true,
      onClick: () => {
        window.location.href = `/vote/${eventId}`;
      },
    });
  },

  /**
   * Notify when event is finalized
   */
  eventFinalized: (eventTitle: string, eventId: string, topChoice: string) => {
    return showNotification("Event Finalized! 🎯", {
      body: `"${eventTitle}" - Top choice: ${topChoice}`,
      tag: `finalized-${eventId}`,
      requireInteraction: false,
      onClick: () => {
        window.location.href = `/results/${eventId}`;
      },
    });
  },
};

/**
 * Check if user has previously dismissed notification prompt
 */
export function hasUserDismissedNotificationPrompt(): boolean {
  return localStorage.getItem("notificationPromptDismissed") === "true";
}

/**
 * Mark notification prompt as dismissed
 */
export function markNotificationPromptDismissed(): void {
  localStorage.setItem("notificationPromptDismissed", "true");
}

/**
 * Clear dismissed state (for testing or user settings)
 */
export function clearNotificationPromptDismissed(): void {
  localStorage.removeItem("notificationPromptDismissed");
}
