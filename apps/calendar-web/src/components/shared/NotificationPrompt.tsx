import { useState } from "react";
import { IconBell, IconX, IconBellOff } from "@tabler/icons-react";
import Card from "./Card";
import Button from "./Button";
import {
  requestNotificationPermission,
  getNotificationPermission,
  hasUserDismissedNotificationPrompt,
  markNotificationPromptDismissed,
  isNotificationSupported,
} from "../../utils/notifications";

/**
 * Notification permission prompt component
 * Shows a friendly prompt to enable notifications if:
 * - Notifications are supported
 * - Permission not yet granted
 * - User hasn't dismissed the prompt
 */
export default function NotificationPrompt() {
  const [show, setShow] = useState(() => {
    // Check if we should show the prompt
    return (
      isNotificationSupported() &&
      getNotificationPermission() === "default" &&
      !hasUserDismissedNotificationPrompt()
    );
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    const permission = await requestNotificationPermission();
    setIsRequesting(false);

    if (permission === "granted") {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    markNotificationPromptDismissed();
    setShow(false);
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50 animate-slide-up">
      <Card className="shadow-2xl border-2 border-ocean-300">
        <div className="flex items-start gap-3">
          <IconBell size={32} className="text-ocean-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-ocean-700 mb-1">
              Enable Notifications?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Get notified about voting deadlines, event updates, and when
              friends vote.
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnable}
                disabled={isRequesting}
                className="flex-1"
              >
                {isRequesting ? "Enabling..." : "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-1"
              >
                Not Now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification prompt"
          >
            <IconX size={20} />
          </button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Notification settings toggle for user profile/settings page
 */
export function NotificationSettings() {
  const [permission, setPermission] = useState<string>(
    getNotificationPermission(),
  );
  const [isRequesting, setIsRequesting] = useState(false);

  const handleToggle = async () => {
    if (permission === "granted") {
      // Can't revoke permission via code - show instruction
      alert(
        "To disable notifications, please use your browser settings:\n\n" +
          "Chrome: Settings > Privacy and Security > Site Settings > Notifications\n" +
          "Firefox: Settings > Privacy & Security > Permissions > Notifications\n" +
          "Safari: Settings > Websites > Notifications",
      );
      return;
    }

    setIsRequesting(true);
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    setIsRequesting(false);
  };

  if (!isNotificationSupported()) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <IconBellOff size={24} className="text-gray-400" />
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            Notifications are not supported in your browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-ocean-50 rounded-lg border border-ocean-200">
      <IconBell
        size={24}
        className={
          permission === "granted" ? "text-seaweed-600" : "text-gray-400"
        }
      />
      <div className="flex-1">
        <h4 className="font-semibold text-gray-800">Browser Notifications</h4>
        <p className="text-sm text-gray-600">
          {permission === "granted"
            ? "Enabled - You'll receive notifications about events"
            : permission === "denied"
              ? "Blocked - Enable in browser settings to receive notifications"
              : "Get notified about voting deadlines and event updates"}
        </p>
      </div>
      {permission !== "denied" && (
        <Button
          variant={permission === "granted" ? "outline" : "primary"}
          size="sm"
          onClick={handleToggle}
          disabled={isRequesting}
        >
          {isRequesting
            ? "Loading..."
            : permission === "granted"
              ? "Enabled"
              : "Enable"}
        </Button>
      )}
    </div>
  );
}
