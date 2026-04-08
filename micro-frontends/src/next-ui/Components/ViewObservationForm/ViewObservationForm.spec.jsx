import React from "react";
import { render as rtlRender, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import ViewObservationForm from "./ViewObservationForm.jsx";
import { observationList, observationListWithGroupMembers } from "./FileViewer/FileViewerMockData";
import { formatDate } from "../../utils/utils";
import axios from "axios";

jest.mock("axios");

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
    "PROVIDER": "Provider",
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
  "APPROVED_SUCCESSFULLY": "{formName} approved successfully",
  "PROVIDER": "Provider"
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
  enableFormApprovalsAndComments: true,
  encounterUuid: "test-encounter-uuid",
  patient: { uuid: "test-patient-uuid" },
  currentProvider: { uuid: "test-user-uuid" },
  formActionsConceptIdMap: {
    FORM_COMMENT: "comment-concept-id",
    FORM_APPROVAL: "approval-concept-id",
  },
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
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should match the screenshot", async () => {
    const { container } = renderWithIntl(<ViewObservationForm {...initialProps} />);
    await waitFor(() => {
      expect(container.querySelector(".section-body")).not.toBeNull();
    });
    expect(container).toMatchSnapshot();
  });

  it("should highlight member in red if it is abnormal", async () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    const element = await screen.findByTestId("section-label-0");
    expect(element.classList.contains("is-abnormal")).toBeTruthy();
  });

  it("should show loader", () => {
    const updatedProps = { ...initialProps, isViewFormLoading: true };
    renderWithIntl(<ViewObservationForm {...updatedProps} />);
    expect(screen.queryAllByText("Active loading indicator")).toHaveLength(2);
  });

  it("should render and group complex type like video/image/pdf which is in first level of hierarchy", async () => {
    const updatedProps = { ...initialProps, formData: observationList};
    const { container } = renderWithIntl(<ViewObservationForm {...updatedProps} />);

    await waitFor(() => {
      const fileSections = container.querySelectorAll(".file-section");
      expect(fileSections).toHaveLength(2);
    });

    const fileSections = container.querySelectorAll(".file-section");
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

  it("should render and group complex type like image which is in second level of hierarchy", async () => {
    const updatedProps = { ...initialProps, formData: observationListWithGroupMembers};
    const { container } = renderWithIntl(<ViewObservationForm {...updatedProps} />);

    await waitFor(() => {
      expect(container.querySelector(".section-header")).not.toBeNull();
    });

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

  it("should not render Comment and Approve buttons when enableFormApprovalsAndComments is false", () => {
    const propsWithFeatureDisabled = {
      ...initialProps,
      enableFormApprovalsAndComments: false,
    };
    renderWithIntl(<ViewObservationForm {...propsWithFeatureDisabled} />);

    expect(screen.queryByText("Comment")).toBeNull();
    expect(screen.queryByText("Approve")).toBeNull();
  });

  it("should render actions table with column headers", async () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeTruthy();
      expect(screen.getByText("Action")).toBeTruthy();
      expect(screen.getByText("Date & Time")).toBeTruthy();
      expect(screen.getByText("Provider")).toBeTruthy();
      expect(screen.getByText("Comments")).toBeTruthy();
    });
  });

  it("should render Creation row in actions table with createdDateTime and createdBy", async () => {
    renderWithIntl(
      <ViewObservationForm
        {...initialProps}
        createdDateTime="20 Feb 2025 10:00 am"
        createdBy="Admin"
      />
    );
    await waitFor(() => {
      expect(screen.getByText("Creation")).toBeTruthy();
      expect(screen.getByText("20 Feb 2025 10:00 am")).toBeTruthy();
      expect(screen.getByText("Admin")).toBeTruthy();
    });
  });

  it("should render actions history rows when getAllTasks returns data", async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: {
        entry: [
          {
            resource: {
              code: { text: "FORM_COMMENT" },
              owner: { display: "Doctor One" },
              authoredOn: "2025-02-20T10:00:00.000Z",
              note: [{ text: "This is a comment" }],
            },
          },
        ],
      },
    });

    renderWithIntl(<ViewObservationForm {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByText("This is a comment")).toBeTruthy();
      expect(screen.getByText("Doctor One")).toBeTruthy();
    });
  });

  it("should hide confirmation banner when Cancel is clicked", async () => {
    renderWithIntl(<ViewObservationForm {...initialProps} />);
    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText("Do you want to proceed with approving this form?")).toBeTruthy();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Do you want to proceed with approving this form?")).toBeNull();
    });
  });

  it("should call axios.post with FORM_APPROVAL code when confirmation Submit is clicked", async () => {
    axios.post.mockResolvedValue({});
    axios.get.mockResolvedValue({ data: {} });

    renderWithIntl(<ViewObservationForm {...initialProps} />);
    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText("Do you want to proceed with approving this form?")).toBeTruthy();
    });

    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/openmrs/ws/fhir2/R4/Task",
        expect.objectContaining({
          code: {
            coding: [{ code: "approval-concept-id" }],
          },
        })
      );
    });
  });

  it("should call axios.post with FORM_COMMENT code when comment is saved", async () => {
    axios.post.mockResolvedValue({});
    axios.get.mockResolvedValue({ data: {} });

    renderWithIntl(<ViewObservationForm {...initialProps} />);
    fireEvent.click(screen.getByText("Comment"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter a maximum of 256 characters")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("Enter a maximum of 256 characters"), {
      target: { value: "A new comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/openmrs/ws/fhir2/R4/Task",
        expect.objectContaining({
          code: {
            coding: [{ code: "comment-concept-id" }],
          },
          note: [{ text: "A new comment" }],
        })
      );
    });
  });

  it("should show success banner after comment is saved successfully", async () => {
    axios.post.mockResolvedValue({});
    axios.get.mockResolvedValue({ data: {} });

    renderWithIntl(<ViewObservationForm {...initialProps} />);
    fireEvent.click(screen.getByText("Comment"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter a maximum of 256 characters")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("Enter a maximum of 256 characters"), {
      target: { value: "A new comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText("Comment added successfully!")).toBeTruthy();
    });
  });
});
