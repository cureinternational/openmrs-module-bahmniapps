import React from "react";
import { render as rtlRender, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import ViewObservationForm from "./ViewObservationForm.jsx";
import { observationList, observationListWithGroupMembers } from "./FileViewer/FileViewerMockData";
import { formatDate } from "../../utils/utils";

jest.mock("../i18n/I18nProvider", () => {
  // eslint-disable-next-line global-require
  const React = require("react");
  // eslint-disable-next-line global-require
  const { IntlProvider } = require("react-intl");

  const mockMessages = {
    "APPROVE": "Approve",
    "COMMENT": "Comment",
    "COMMENT_ADDED_SUCCESSFULLY": "Comment added successfully!",
    "CONFIRMATION": "Confirmation",
    "APPROVE_FORM_CONFIRMATION": "Do you want to proceed with approving this form?",
    "CANCEL": "Cancel",
    "SUBMIT": "Submit",
    "ACTIONS": "Actions",
    "CREATION": "Creation",
    "COMMENT_ACTION": "Comment",
    "APPROVED_SUCCESSFULLY": "{formName} approved successfully",
    "ACTION": "Action",
    "DATE_TIME": "Date & Time",
    "USERNAME": "Username",
    "COMMENTS_COLUMN": "Comments"
  };

  return {
    // eslint-disable-next-line react/prop-types
    I18nProvider: ({ children }) =>
      React.createElement(IntlProvider, { locale: "en", messages: mockMessages }, children)
  };
});

const mockMessages = {
  "APPROVE": "Approve",
  "COMMENT": "Comment",
  "COMMENT_ADDED_SUCCESSFULLY": "Comment added successfully!",
  "CONFIRMATION": "Confirmation",
  "APPROVE_FORM_CONFIRMATION": "Do you want to proceed with approving this form?",
  "CANCEL": "Cancel",
  "SUBMIT": "Submit",
  "ACTIONS": "Actions",
  "CREATION": "Creation",
  "COMMENT_ACTION": "Comment",
  "APPROVED_SUCCESSFULLY": "{formName} approved successfully"
};

const renderWithIntl = (component) => {
  return rtlRender(
    <IntlProvider locale="en" messages={mockMessages}>
      {component}
    </IntlProvider>
  );
};

const initialProps = {
  formName: "Vitals",
  formNameTranslations: "Vitals",
  isViewFormLoading: false,
  formData: [
    {
      concept: {
        shortName: "Pulse",
        hiNormal: 100,
        lowNormal: 60,
      },
      value: "105",
      groupMembers: [],
      interpretation: "Abnormal",
      comment: "notes example",
      providers: [{ name: "test provider" }],
    },
    {
      concept: {
        shortName: "Pulse",
        hiNormal: 100,
        lowNormal: 60,
        units: "beats/min",
      },
      valueAsString: "105",
      groupMembers: [],
      comment: "notes example",
    },
    {
      concept: { shortName: "Blood Pressure" },
      groupMembers: [
        {
          concept: {
            shortName: "Systolic Blood Pressure",
            hiNormal: 140,
            lowNormal: 100,
            units: "mmHg"
          },
          value: "120",
          interpretation: "Abnormal",
          comment: "notes example",
          providers: [{ name: "test provider" }],
        },
        {
          concept: {
            shortName: "Diastolic Blood Pressure",
            hiNormal: 90,
            lowNormal: 60,
            units: "mmHg",
          },
          value: "80",
          comment: "notes example",
        },
      ],
    },
  ],
};

describe("ViewObservationForm", () => {
  it("should match the screenshot", () => {
    const { container } = renderWithIntl(<ViewObservationForm {...initialProps} />);
    expect(container).toMatchSnapshot();
  });

  it("should highlight member in red if it is abnormal", () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    const element = screen.getByTestId("section-label-0");
    expect(element.classList.contains("is-abnormal")).toBeTruthy();
  });

  it("should show loader", () => {
    const updatedProps = { ...initialProps, isViewFormLoading: true };
    renderWithIntl(<ViewObservationForm {...updatedProps} />);
    expect(screen.queryAllByText("Active loading indicator")).toHaveLength(2);
  });

  it("should render and group complex type like video/image/pdf which is in first level of hierarchy", () => {
    const updatedProps = { ...initialProps, formData: observationList};
    const { container } = renderWithIntl(<ViewObservationForm {...updatedProps} />);

    const fileSections = container.querySelectorAll(".file-section");
    expect(fileSections).toHaveLength(2);
    const video = fileSections[0];
    
    expect(video).not.toBeNull();
    expect(within(video).getByText(/Patient Video/i)).toBeTruthy();
    expect(within(video).getByText(/Sample comments are added one/i)).toBeTruthy();
    expect(within(video).getByText(/Sample comments are added two/i)).toBeTruthy();
    expect(within(video).getAllByText(/test provider one/i)).toHaveLength(2);
    expect(within(video).getAllByText(new RegExp(formatDate(observationList[0].encounterDateTime)))).toHaveLength(2);
    
    expect(container.querySelectorAll(".file-section .video-viewer")).toHaveLength(2);
    expect(container.querySelectorAll(".file-section .video-viewer.video-0")).toHaveLength(1);
    expect(container.querySelectorAll(".file-section .video-viewer.video-1")).toHaveLength(1);
    
    const image = fileSections[1];
    expect(image).not.toBeNull();

    expect(within(image).getByText(/Image/i)).toBeTruthy();
    expect(within(image).getByText(/Sample comments are added three/i)).toBeTruthy();
    expect(within(image).getByText(/Sample comments are added four/i)).toBeTruthy();
    expect(within(image).getAllByText(/test provider one/i)).toHaveLength(3);
    expect(within(image).getAllByText(new RegExp(formatDate(observationList[0].encounterDateTime)))).toHaveLength(3);
    
    expect(container.querySelectorAll(".file-section .image-viewer")).toHaveLength(3);
    expect(container.querySelectorAll(".file-section .image-viewer.img-0")).toHaveLength(1);
    expect(container.querySelectorAll(".file-section .image-viewer.img-1")).toHaveLength(1);
    expect(container.querySelectorAll(".file-section .image-viewer.img-2 .pdf-link")).toHaveLength(1);

  });

  it("should render and group complex type like image which is in second level of hierarchy", () => {
    const updatedProps = { ...initialProps, formData: observationListWithGroupMembers};
    const { container } = renderWithIntl(<ViewObservationForm {...updatedProps} />);

    const sectionHeader = container.querySelector(".section-header");
    expect(within(sectionHeader).getByText(/Consultation Images/i)).toBeTruthy();

    expect(container.querySelector(".row-label")).toBeTruthy();
    expect(container.querySelector(".row-label").textContent).toBe("Image 0-9-3");

    expect(container.querySelectorAll(".row-value .image-viewer")).toHaveLength(2);

    const imageRowOne = container.querySelector(".row-value .image-viewer.img-0");
    expect(imageRowOne).toBeTruthy();
    expect(within(imageRowOne).getByText(/Notes 1/i)).toBeTruthy();
    expect(within(imageRowOne).getByText(/provider one/i)).toBeTruthy();
    expect(within(imageRowOne).getByText(new RegExp(formatDate(observationListWithGroupMembers[0].encounterDateTime)))).toBeTruthy();

    const imageRowTwo = container.querySelector(".row-value .image-viewer.img-1");
    expect(imageRowTwo).toBeTruthy();
    expect(within(imageRowTwo).getByText(/Notes 2/i)).toBeTruthy();
    expect(within(imageRowTwo).getByText(/provider one/i)).toBeTruthy();
    expect(within(imageRowTwo).getByText(new RegExp(formatDate(observationListWithGroupMembers[0].encounterDateTime)))).toBeTruthy();
  });

  it("should render Comment and Approve buttons", () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    expect(screen.getByText("Comment")).toBeTruthy();
    expect(screen.getByText("Approve")).toBeTruthy();
  });

  it("should open CommentPanel when Comment button is clicked", async () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    const commentButton = screen.getByText("Comment");
    fireEvent.click(commentButton);
    await waitFor(() => {
      expect(screen.getByText("Add Comment")).toBeTruthy();
    });
  });

  it("should display comment action in the actions table when comment exists", () => {
    renderWithIntl(<ViewObservationForm
      {...initialProps}
      actionsHistory={[]}
      createdDateTime="20 Feb 2025 10:00 am"
      createdBy="Admin"
    />);

    const commentButton = screen.getByText("Comment");
    expect(commentButton).toBeTruthy();
  });

  it("should show confirmation banner when Approve button is clicked", async () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText("Do you want to proceed with approving this form?")).toBeTruthy();
    });
  });

  it("should show and then clear success banner when different actions are taken", () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);

    const commentButton = screen.getByText("Comment");
    const approveButton = screen.getByText("Approve");

    expect(commentButton).toBeTruthy();
    expect(approveButton).toBeTruthy();
  });
});
