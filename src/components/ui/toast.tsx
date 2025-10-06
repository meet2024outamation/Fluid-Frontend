import React, { useEffect, useState } from "react";
import { notificationService } from "../../services/notificationService";
import type { NotificationMessage } from "../../types";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const getNotificationIcon = (type: NotificationMessage["type"]) => {
    const iconProps = { className: "h-5 w-5 flex-shrink-0" };

    switch (type) {
      case "success":
        return (
          <CheckCircle
            {...iconProps}
            className={`${iconProps.className} text-green-600`}
          />
        );
      case "error":
        return (
          <XCircle
            {...iconProps}
            className={`${iconProps.className} text-red-600`}
          />
        );
      case "warning":
        return (
          <AlertTriangle
            {...iconProps}
            className={`${iconProps.className} text-yellow-600`}
          />
        );
      case "info":
      default:
        return (
          <Info
            {...iconProps}
            className={`${iconProps.className} text-blue-600`}
          />
        );
    }
  };

  const getNotificationClasses = (type: NotificationMessage["type"]) => {
    const baseClasses =
      "flex items-start gap-3 p-4 rounded-lg shadow-lg border min-w-80 max-w-md backdrop-blur-sm";

    switch (type) {
      case "success":
        return `${baseClasses} bg-green-50/95 border-green-200 text-green-800`;
      case "error":
        return `${baseClasses} bg-red-50/95 border-red-200 text-red-800`;
      case "warning":
        return `${baseClasses} bg-yellow-50/95 border-yellow-200 text-yellow-800`;
      case "info":
      default:
        return `${baseClasses} bg-blue-50/95 border-blue-200 text-blue-800`;
    }
  };

  const getPositionClasses = (position: string = "top-right") => {
    switch (position) {
      case "top-left":
        return "fixed top-4 left-4 z-50";
      case "top-center":
        return "fixed top-4 left-1/2 transform -translate-x-1/2 z-50";
      case "top-right":
      default:
        return "fixed top-4 right-4 z-50";
      case "bottom-left":
        return "fixed bottom-4 left-4 z-50";
      case "bottom-center":
        return "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50";
      case "bottom-right":
        return "fixed bottom-4 right-4 z-50";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  // Group notifications by position
  const notificationsByPosition = notifications.reduce(
    (acc, notification) => {
      const position = notification.options?.position || "top-right";
      if (!acc[position]) acc[position] = [];
      acc[position].push(notification);
      return acc;
    },
    {} as Record<string, NotificationMessage[]>
  );

  return (
    <>
      {Object.entries(notificationsByPosition).map(
        ([position, positionNotifications]) => (
          <div
            key={position}
            className={`${getPositionClasses(position)} space-y-2`}
          >
            {positionNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`${getNotificationClasses(notification.type)} animate-in slide-in-from-right duration-300`}
              >
                {notification.options?.showIcon !== false &&
                  getNotificationIcon(notification.type)}

                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <div className="font-semibold text-sm mb-1">
                      {notification.title}
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">
                    {notification.message}
                  </div>
                </div>

                {notification.options?.closable !== false && (
                  <button
                    onClick={() => notificationService.remove(notification.id)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-current hover:bg-opacity-10 transition-colors"
                    aria-label="Close notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
};

export default NotificationContainer;
