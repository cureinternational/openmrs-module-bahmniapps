import React from "react";
import { useMemo, useEffect } from 'react';
import PropTypes from "prop-types";
import { InlineNotification } from "carbon-components-react";
import "./Notification.scss";

export default function Notification(props) {
  const { hostData, hostApi } = props;
  const {
    notificationKind = "success",
    messageId,
    title: directTitle,
    messageDuration = 2000
  } = hostData;

  console.log("Notification rendering with:", { notificationKind, title: directTitle, messageDuration });

  useEffect(() => {
    if (messageDuration > 0) {
      const timer = setTimeout(() => {
        console.log("Notification auto-closing after", messageDuration, "ms");
        hostApi?.onClose();
      }, messageDuration);
      return () => clearTimeout(timer);
    }
  }, [messageDuration, hostApi]);

  const title = useMemo(() => {
    // If direct title is provided, use it
    if (directTitle) {
      return directTitle;
    }
    // If messageId is provided, return it as-is (no i18n translation)
    return messageId || "";
  }, [messageId, directTitle]);

  return (
    <InlineNotification
      className="notification"
      kind={notificationKind}
      title={title}
      subtitle=""
      hideCloseButton={true}
      lowContrast={true}
    />
  );
}

Notification.propTypes = {
  hostData: PropTypes.shape({
    notificationKind: PropTypes.string,
    messageDuration: PropTypes.number,
    messageId: PropTypes.string,
    title: PropTypes.string,
  }),
  hostApi: PropTypes.shape({
    onClose: PropTypes.func,
  }).isRequired,
};
