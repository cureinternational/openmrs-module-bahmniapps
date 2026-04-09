import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import DraftOverlay from "./DraftOverlay";
import { mockFormDrafts } from "./DraftOverlayMockData";

const renderWithIntl = (ui) =>
    render(<IntlProvider locale="en" defaultLocale="en">{ui}</IntlProvider>);

describe("DraftOverlay", () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders draft list with correct patient name", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        expect(screen.getByText("Helina Zekariyas")).toBeTruthy();
        expect(screen.getByText("Amen Dawit")).toBeTruthy();
        expect(screen.getByText("Ibrahim Abdul")).toBeTruthy();
    });

    it("renders draft list with correct identifier", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        expect(screen.getByText("ET73635")).toBeTruthy();
        expect(screen.getByText("ET73636")).toBeTruthy();
        expect(screen.getByText("ET73637")).toBeTruthy();
    });

    it("renders draft list with formatted timestamp", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        expect(screen.getByText("23 Feb 2026, 12:30 PM")).toBeTruthy();
    });

    it("renders empty state when formDrafts is empty", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={[]} onClose={mockOnClose} />
        );

        expect(screen.getByText("No drafts yet")).toBeTruthy();
        expect(screen.getByText("You don't have any saved drafts")).toBeTruthy();
    });

    it("does not render draft rows when formDrafts is empty", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={[]} onClose={mockOnClose} />
        );

        expect(screen.queryByText("ET73635")).toBeNull();
    });

    it("calls onClose when close button is clicked", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        fireEvent.click(screen.getByLabelText("Close drafts overlay"));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not show divider after the last draft row", () => {
        const { container } = renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        const dividers = container.querySelectorAll(".draft-overlay__divider");
        expect(dividers.length).toBe(mockFormDrafts.length - 1);
    });

    it("shows correct draft count in header", () => {
        renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        expect(screen.getByText(`Observation Drafts (${mockFormDrafts.length})`)).toBeTruthy();
    });

    it("matches snapshot with drafts", () => {
        const { container } = renderWithIntl(
            <DraftOverlay formDrafts={mockFormDrafts} onClose={mockOnClose} />
        );

        expect(container).toMatchSnapshot();
    });

    it("matches snapshot with empty state", () => {
        const { container } = renderWithIntl(
            <DraftOverlay formDrafts={[]} onClose={mockOnClose} />
        );

        expect(container).toMatchSnapshot();
    });
});
