import React, { useState } from "react";
import propTypes from "prop-types";
import { Button, TextArea, Loading } from "carbon-components-react";
import { useIntl } from "react-intl";
import { COMMENT_MAX_CHARACTERS } from "../../../constants";
import "./commentPanel.scss";

export const CommentPanel = (props) => {
  const {
    onClose,
    onSaveComment,
    maxCharacters = COMMENT_MAX_CHARACTERS,
  } = props;

  const intl = useIntl();

  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (commentText.trim()) {
      setIsLoading(true);
      onSaveComment(commentText);
      setCommentText("");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCommentText("");
    onClose();
  };

  return (
    <>
      {isLoading && <div className="page-blur-backdrop" />}
      <section className="comment-panel-container">
        {isLoading && (
          <div className="loading-overlay">
            <Loading />
          </div>
        )}

        <div className="add-comment-section">
          <h3 className="section-heading">
            {intl.formatMessage({ id: "ADD_COMMENT", defaultMessage: "Add Comment" })}
          </h3>
          <div className="comment-input-group">
            <TextArea
              id="comment-textarea"
              className="comment-textarea"
              labelText=""
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={intl.formatMessage({ id: "COMMENT_PLACEHOLDER", defaultMessage: `Enter a maximum of ${maxCharacters} characters` })}
              maxLength={maxCharacters}
              disabled={isLoading}
            />

            <div className="comment-actions">
              <Button
                className="cancel-button"
                kind="secondary"
                size="large"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {intl.formatMessage({ id: "CANCEL", defaultMessage: "Cancel" })}
              </Button>
              <Button
                className="save-button"
                kind="primary"
                size="large"
                onClick={handleSave}
                disabled={!commentText.trim() || isLoading}
              >
                {intl.formatMessage({ id: "SAVE", defaultMessage: "Save" })}
              </Button>
            </div>
          </div>
        </div>

      </section>
    </>
  );
};

CommentPanel.propTypes = {
  onClose: propTypes.func,
  onSaveComment: propTypes.func,
  maxCharacters: propTypes.number,
  saveDelay: propTypes.number,
};

export default CommentPanel;
