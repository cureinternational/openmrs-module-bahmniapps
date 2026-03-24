import React from "react";
import { render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import Notification from "./Notification";

const renderWithProviders = (ui) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe("Notification", () => {
  it("should show success notification", () => {
    const { container } = renderWithProviders(
      <Notification
        hostData={{ notificationKind: "success", messageId: "SUCCESS_MESSAGE" }}
        hostApi={{}}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it("should show warning notification", () => {
    const { container } = renderWithProviders(
      <Notification
        hostData={{ notificationKind: "warning", messageId: "WARNING_MESSAGE" }}
        hostApi={{}}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
