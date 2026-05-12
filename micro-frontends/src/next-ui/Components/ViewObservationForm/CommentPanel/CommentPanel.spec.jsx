import React from "react";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { CommentPanel } from "./CommentPanel";

const mockMessages = {
  "CANCEL": "Cancel",
  "SAVE": "Save",
  "ADD_COMMENT": "Add Comment",
  "COMMENT_PLACEHOLDER": "Enter a maximum of {maxCharacters} characters"
};

const render = (component) => {
  return rtlRender(
    <IntlProvider locale="en" messages={mockMessages}>
      {component}
    </IntlProvider>
  );
};

describe("CommentPanel", () => {
  const mockOnClose = jest.fn();
  const mockOnSaveComment = jest.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onSaveComment: mockOnSaveComment,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the comment panel", () => {
    render(<CommentPanel {...defaultProps} />);
    expect(screen.getByText("Add Comment")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter a maximum of 255 characters")).toBeTruthy();
  });

  it("should render Cancel and Save buttons", () => {
    render(<CommentPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /save/i })).toBeTruthy();
  });

  it("should disable Save button when textarea is empty", () => {
    render(<CommentPanel {...defaultProps} />);
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton.hasAttribute("disabled")).toBeTruthy();
  });

  it("should enable Save button when textarea has text", () => {
    render(<CommentPanel {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Enter a maximum of 255 characters");
    fireEvent.change(textarea, { target: { value: "Test comment" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(!saveButton.hasAttribute("disabled")).toBeTruthy();
  });

  it("should call onClose when Cancel button is clicked", () => {
    render(<CommentPanel {...defaultProps} />);
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should clear textarea when Cancel button is clicked", () => {
    render(<CommentPanel {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Enter a maximum of 255 characters");
    fireEvent.change(textarea, { target: { value: "Test comment" } });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(textarea.value).toBe("");
  });

  it("should use custom maxCharacters prop", () => {
    const customProps = { ...defaultProps, maxCharacters: 500 };
    render(<CommentPanel {...customProps} />);
    const textarea = screen.getByPlaceholderText("Enter a maximum of 500 characters");
    expect(textarea.maxLength).toBe(500);
  });
});
