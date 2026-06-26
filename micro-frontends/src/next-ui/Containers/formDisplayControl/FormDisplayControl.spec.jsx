import React from "react";
import moment from "moment";
import { render, screen, waitFor } from "@testing-library/react";
import { FormDisplayControl } from "./FormDisplayControl";
import {
  mockFormResponseData,
  mockLatestPublishedForms,
  mockFormResponseDataForPrivilege,
  mockLatestPublishedFormsWithEditPrivileges,
  mockLatestPublishedFormsWithViewPrivileges,
  mockLatestPublishedFormsWithBothViewEditPrivileges,
  mockLatestPublishedFormsWithoutBothViewEditPrivileges,
} from "./FormDisplayControlMockData";
import { defaultDateTimeFormat } from "../../constants";

const mockFetchFormData = jest.fn();
const mockGetLatestPublishedForms = jest.fn();
const mockGetAllTasksForPatient = jest.fn();

const mockFormActionsConceptIdMap = {
  FORM_COMMENT: "comment-concept-uuid",
  FORM_APPROVAL: "approval-concept-uuid",
};

const mockAppService = {
  getAppDescriptor: () => ({
    getConfigValue: (configName) => {
      if (configName === "enableFormApprovalsAndComments") {
        return true;
      }
      if (configName === "formActionsConceptIdMap") {
        return mockFormActionsConceptIdMap;
      }
      return undefined;
    },
  }),
};

jest.mock("../../utils/FormDisplayControl/FormUtils", () => ({
  fetchFormData: () => mockFetchFormData(),
  getLatestPublishedForms: () => mockGetLatestPublishedForms(),
  getAllTasksForPatient: (...args) => mockGetAllTasksForPatient(...args),
}));

jest.mock("../../Components/i18n/I18nProvider", () => ({
  I18nProvider: ({ children }) => <div>{children}</div>,
}));

const mockHostData = {
  patientUuid: "some-patient-uuid",
  showEditForActiveEncounter: true,
  encounterUuid: "some-encounter-uuid",
};

const activeEncounterMockHostDataWithPrivileges = {
  patientUuid: "some-patient-uuid",
  showEditForActiveEncounter: true,
  encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
  currentUser: {
    privileges: [
      {
        name: "View/Edit Forms",
        retired: false,
      },
    ],
  },
};

beforeEach(() => {
  mockGetAllTasksForPatient.mockResolvedValue({ data: { entry: [] } });
});

describe("FormDisplayControl Component for empty mock data", () => {
  it("should show no-forms-message when form entries are empty", async () => {
    const mockWithPatientHostData = {
      patientUuid: "some-patient-uuid",
      encounterUuid: undefined,
    };
    mockFetchFormData.mockResolvedValueOnce({});

    const { container } = render(
      <FormDisplayControl hostData={mockWithPatientHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No Form found for this patient....")
      ).toBeTruthy();
    });
  });
});

describe("FormDisplayControl Component", () => {
  it("should render the component", () => {
    const { container } = render(
      <FormDisplayControl hostData={mockHostData} appService={mockAppService} />
    );
    expect(container).toMatchSnapshot();
  });

  it("should show loading message", () => {
    const { container } = render(
      <FormDisplayControl hostData={mockHostData} appService={mockAppService} />
    );
    expect(container.querySelector(".loading-message")).not.toBeNull();
    expect(container.querySelector(".loading-message").innerHTML).toEqual(
      "Loading... Please Wait"
    );
  });
});

describe("FormDisplayControl Component with Accordion", () => {
  beforeEach(() => {
    mockFetchFormData.mockResolvedValue(mockFormResponseData);
    mockGetLatestPublishedForms.mockResolvedValue(mockLatestPublishedForms);
  });

  it("should render all form groups in accordion format when loading is done", async () => {
    const { container } = render(
      <FormDisplayControl hostData={mockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".bx--accordion__title")).toHaveLength(3);
      const titles = container.querySelectorAll(".form-accordion-title");
      expect(titles[0].textContent.trim()).toContain("Orthopaedic Triage");
      expect(titles[1].textContent.trim()).toContain("Pre Anaesthesia Assessment");
      expect(titles[2].textContent.trim()).toContain("Patient Progress Notes and Orders");
    });
  });

  it("should render form entries with date links and providers inside accordion rows", async () => {
    const { container } = render(
      <FormDisplayControl hostData={mockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      // 4 total rows: 1 Orthopaedic Triage + 2 Pre Anaesthesia Assessment (sorted desc) + 1 PPNO
      expect(container.querySelectorAll(".row-accordion")).toHaveLength(4);
      const links = container.querySelectorAll(".form-link");
      expect(links[0].innerHTML).toEqual(moment(1693277657000).format(defaultDateTimeFormat));
      expect(links[1].innerHTML).toEqual(moment(1693217959000).format(defaultDateTimeFormat));
      expect(links[2].innerHTML).toEqual(moment(1692950695000).format(defaultDateTimeFormat));
      expect(links[3].innerHTML).toEqual(moment(1693277657000).format(defaultDateTimeFormat));
      const providers = container.querySelectorAll(".form-provider-text");
      expect(providers[0].innerHTML).toEqual("Doctor Two");
      expect(providers[1].innerHTML).toEqual("Doctor One");
      expect(providers[3].innerHTML).toEqual("Doctor One");
    });
  });

  it("should show approval and comment indicators when tasks exist for a form entry", async () => {
    mockGetAllTasksForPatient.mockResolvedValueOnce({
      data: {
        entry: [
          {
            resource: {
              code: { text: "FORM_APPROVAL" },
              extension: [{ url: "http://fhir.bahmni.org/ext/task/name", valueString: "Orthopaedic Triage" }],
              encounter: { reference: "Encounter/6e52cecd-a095-457f-9515-38cf9178cb50" },
            },
          },
          {
            resource: {
              code: { text: "FORM_COMMENT" },
              extension: [{ url: "http://fhir.bahmni.org/ext/task/name", valueString: "Orthopaedic Triage" }],
              encounter: { reference: "Encounter/6e52cecd-a095-457f-9515-38cf9178cb50" },
            },
          },
        ],
      },
    });

    const { container } = render(
      <FormDisplayControl hostData={mockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      // Approval indicator: CheckmarkFilled icon for approved encounter
      expect(container.querySelector(".form-approval-icon-container .success-banner-icon")).not.toBeNull();
      // Form action indicator: green dot on accordion title when form has actions
      const actionIndicators = container.querySelectorAll(".form-action-indicator");
      const greenIndicator = Array.from(actionIndicators).find(
        (el) => el.style.backgroundColor === "rgb(25, 128, 56)"
      );
      expect(greenIndicator).not.toBeUndefined();
    });
  });

  it("should not see edit button for non-active-encounter entries and when showEditForActiveEncounter is true", async () => {
    const { container } = render(
      <FormDisplayControl hostData={mockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(0);
    });
  });

  it("should see edit button for active-encounter entries and when showEditForActiveEncounter is true", async () => {
    const activeEncounterMockHostData = {
      patientUuid: "some-patient-uuid",
      showEditForActiveEncounter: true,
      encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
    };
    const { container } = render(
      <FormDisplayControl hostData={activeEncounterMockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(2);
    });
  });

  it("should see edit button for all entries and when showEditForActiveEncounter is false", async () => {
    const activeEncounterMockHostData = {
      patientUuid: "some-patient-uuid",
      showEditForActiveEncounter: false,
      encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
    };
    const { container } = render(
      <FormDisplayControl hostData={activeEncounterMockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(4);
    });
  });

  it("should see edit button for all entries and when showEditForActiveEncounter is not present", async () => {
    const activeEncounterMockHostData = {
      patientUuid: "some-patient-uuid",
      encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
    };
    const { container } = render(
      <FormDisplayControl hostData={activeEncounterMockHostData} appService={mockAppService} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(4);
    });
  });

  it("should see edit button based on privilege", async () => {
    mockFetchFormData.mockResolvedValue(mockFormResponseDataForPrivilege);
    mockGetLatestPublishedForms.mockResolvedValue(
      mockLatestPublishedFormsWithEditPrivileges
    );

    const { container } = render(
      <FormDisplayControl
        hostData={activeEncounterMockHostDataWithPrivileges}
        appService={mockAppService}
      />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".form-link")).toHaveLength(0);
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(1);
    });
  });

  it("should see view button based on privilege", async () => {
    mockFetchFormData.mockResolvedValue(mockFormResponseDataForPrivilege);
    mockGetLatestPublishedForms.mockResolvedValue(
      mockLatestPublishedFormsWithViewPrivileges
    );

    const { container } = render(
      <FormDisplayControl
        hostData={activeEncounterMockHostDataWithPrivileges}
        appService={mockAppService}
      />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".form-link")).toHaveLength(1);
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(0);
    });
  });

  it("should see view button based on privilege", async () => {
    mockFetchFormData.mockResolvedValue(mockFormResponseDataForPrivilege);
    mockGetLatestPublishedForms.mockResolvedValue(
      mockLatestPublishedFormsWithBothViewEditPrivileges
    );

    const { container } = render(
      <FormDisplayControl
        hostData={activeEncounterMockHostDataWithPrivileges}
        appService={mockAppService}
      />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".form-link")).toHaveLength(1);
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(1);
    });
  });

  it("should see view button based on privilege", async () => {
    mockFetchFormData.mockResolvedValue(mockFormResponseDataForPrivilege);
    mockGetLatestPublishedForms.mockResolvedValue(
      mockLatestPublishedFormsWithoutBothViewEditPrivileges
    );

    const { container } = render(
      <FormDisplayControl
        hostData={activeEncounterMockHostDataWithPrivileges}
        appService={mockAppService}
      />
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".form-link")).toHaveLength(0);
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(0);
    });
  });

  it("should show disabled pencil icon when a draft exists for that form", async () => {
    const hostDataWithDraft = {
      patientUuid: "some-patient-uuid",
      showEditForActiveEncounter: false,
      encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
      draftFormNames: ["Orthopaedic Triage"],
    };
    const { container } = render(
      <FormDisplayControl hostData={hostDataWithDraft} appService={mockAppService} />
    );

    await waitFor(() => {
      const disabledPencils = container.querySelectorAll(".fa.fa-pencil.pencil-disabled");
      const clickablePencils = container.querySelectorAll(".fa.fa-pencil:not(.pencil-disabled)");
      expect(disabledPencils).toHaveLength(1);
      expect(clickablePencils).toHaveLength(3);
    });
  });

  it("should show all pencil icons as clickable when no draft exists", async () => {
    const hostDataNoDraft = {
      patientUuid: "some-patient-uuid",
      showEditForActiveEncounter: false,
      encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
      draftFormNames: [],
    };
    const { container } = render(
      <FormDisplayControl hostData={hostDataNoDraft} appService={mockAppService} />
    );

    await waitFor(() => {
      const disabledPencils = container.querySelectorAll(".fa.fa-pencil.pencil-disabled");
      const clickablePencils = container.querySelectorAll(".fa.fa-pencil:not(.pencil-disabled)");
      expect(disabledPencils).toHaveLength(0);
      expect(clickablePencils).toHaveLength(4);
    });
  });

  it("should not disable pencil when draftFormNames contains a different form name", async () => {
    const hostDataOtherDraft = {
      patientUuid: "some-patient-uuid",
      showEditForActiveEncounter: false,
      encounterUuid: "6e52cecd-a095-457f-9515-38cf9178cb50",
      draftFormNames: ["Some Other Form"],
    };
    const { container } = render(
      <FormDisplayControl hostData={hostDataOtherDraft} appService={mockAppService} />
    );

    await waitFor(() => {
      const disabledPencils = container.querySelectorAll(".fa.fa-pencil.pencil-disabled");
      expect(disabledPencils).toHaveLength(0);
      expect(container.querySelectorAll(".fa.fa-pencil")).toHaveLength(4);
    });
  });
});
