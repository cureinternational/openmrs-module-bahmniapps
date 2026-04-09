import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DraftIndicator } from "./DraftIndicator";
import { getFormDrafts } from "../../utils/draftIndicator/draftIndicatorUtils";

jest.mock("react-intl", () => ({
    FormattedMessage: ({ defaultMessage, values }) => {
        if (values) {
            return defaultMessage.replace(/\{(\w+)\}/g, (_, key) => values[key]);
        }
        return defaultMessage;
    },
    useIntl: () => ({
        formatMessage: ({ defaultMessage }) => defaultMessage,
    }),
}));

jest.mock("../../Components/i18n/I18nProvider", () => ({
    // eslint-disable-next-line react/prop-types
    I18nProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../utils/draftIndicator/draftIndicatorUtils", () => ({
    getFormDrafts: jest.fn(),
}));

const mockFormDrafts = [
    {
        patientName: "Helina Zekariyas",
        patientUuid: "patient-uuid-1",
        identifier: "ET73635",
        timestamp: "2026-02-23T12:30:00",
    },
    {
        patientName: "Amen Dawit",
        patientUuid: "patient-uuid-2",
        identifier: "ET73636",
        timestamp: "2026-02-23T10:15:00",
    },
];

describe("DraftIndicator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getFormDrafts.mockResolvedValue(mockFormDrafts);
    });

    it("renders icon button", async () => {
        await act(async () => {
            render(<DraftIndicator />);
        });

        expect(screen.getByLabelText("View observation drafts")).toBeTruthy();
    });

    it("shows red dot when drafts exist", async () => {
        let container;
        await act(async () => {
            ({ container } = render(<DraftIndicator />));
        });

        const redDot = container.querySelector(".draft-indicator__red-dot");
        expect(redDot).toBeTruthy();
    });

    it("does not show red dot when no drafts exist", async () => {
        getFormDrafts.mockResolvedValue([]);

        let container;
        await act(async () => {
            ({ container } = render(<DraftIndicator />));
        });

        const redDot = container.querySelector(".draft-indicator__red-dot");
        expect(redDot).toBeNull();
    });

    it("clicking button opens the overlay", async () => {
        await act(async () => {
            render(<DraftIndicator />);
        });

        const button = screen.getByLabelText("View observation drafts");
        act(() => {
            fireEvent.click(button);
        });

        expect(screen.getByText("Observation Drafts (2)")).toBeTruthy();
    });

    it("clicking button again closes the overlay", async () => {
        await act(async () => {
            render(<DraftIndicator />);
        });

        const button = screen.getByLabelText("View observation drafts");

        act(() => {
            fireEvent.click(button);
        });
        expect(screen.getByText("Observation Drafts (2)")).toBeTruthy();

        act(() => {
            fireEvent.click(button);
        });
        expect(screen.queryByText("Observation Drafts (2)")).toBeNull();
    });

    it("overlay closes when close button is clicked", async () => {
        await act(async () => {
            render(<DraftIndicator />);
        });

        act(() => {
            fireEvent.click(screen.getByLabelText("View observation drafts"));
        });
        expect(screen.getByText("Observation Drafts (2)")).toBeTruthy();

        act(() => {
            fireEvent.click(screen.getByLabelText("Close drafts overlay"));
        });
        expect(screen.queryByText("Observation Drafts (2)")).toBeNull();
    });

    it("handles error during initialization gracefully", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        getFormDrafts.mockRejectedValueOnce(new Error("Fetch failed"));

        await act(async () => {
            render(<DraftIndicator />);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Failed to initialize draft indicator",
            expect.any(Error)
        );
        consoleErrorSpy.mockRestore();
    });

    it("matches snapshot", async () => {
        let container;
        await act(async () => {
            ({ container } = render(<DraftIndicator />));
        });

        expect(container).toMatchSnapshot();
    });
});
