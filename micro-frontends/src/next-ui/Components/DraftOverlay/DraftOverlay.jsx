import React from "react";
import { Close16 } from "@carbon/icons-react";
import PropTypes from "prop-types";
import "./DraftOverlay.scss";
import { FormattedMessage } from "react-intl";
import moment from "moment";

const formatTimestamp = (timestamp) => moment(timestamp).format("DD MMM YYYY, hh:mm A");

const DraftRow = ({ draft, showDivider }) => (
    <div className="draft-overlay__row">
        <p className="draft-overlay__patient-name">{draft.patientName}</p>
        <div className="draft-overlay__row-details">
            <span className="draft-overlay__identifier">{draft.identifier}</span>
            <span className="draft-overlay__timestamp">{formatTimestamp(draft.timestamp)}</span>
        </div>
        {showDivider && <div className="draft-overlay__divider" />}
    </div>
);

DraftRow.propTypes = {
    draft: PropTypes.shape({
        patientName: PropTypes.string.isRequired,
        patientUuid: PropTypes.string.isRequired,
        identifier: PropTypes.string.isRequired,
        timestamp: PropTypes.string.isRequired,
    }).isRequired,
    showDivider: PropTypes.bool.isRequired,
};

const EmptyState = () => (
    <div className="draft-overlay__empty-state">
        <p className="draft-overlay__empty-title">
            <FormattedMessage id="NO_DRAFTS_YET" defaultMessage="No drafts yet" />
        </p>
        <p className="draft-overlay__empty-message">
            <FormattedMessage
                id="NO_SAVED_DRAFTS_MESSAGE"
                defaultMessage="You don't have any saved drafts"
            />
        </p>
    </div>
);

const DraftOverlay = ({ formDrafts, onClose }) => {
    return (
        <div className="draft-overlay">
            <div className="draft-overlay__header">
                <span className="draft-overlay__title">
                    <FormattedMessage
                        id="OBSERVATION_DRAFTS_TITLE"
                        defaultMessage="Observation Drafts ({count})"
                        values={{ count: formDrafts.length }}
                    />
                </span>
                <button
                    className="draft-overlay__close-button"
                    onClick={onClose}
                    aria-label="Close drafts overlay"
                >
                    <Close16 />
                </button>
            </div>
            <div className="draft-overlay__content">
                {formDrafts.length === 0 ? (
                    <EmptyState />
                ) : (
                    formDrafts.map((draft, index) => (
                        <DraftRow
                            key={draft.patientUuid}
                            draft={draft}
                            showDivider={index < formDrafts.length - 1}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

DraftOverlay.propTypes = {
    formDrafts: PropTypes.arrayOf(
        PropTypes.shape({
            patientName: PropTypes.string.isRequired,
            patientUuid: PropTypes.string.isRequired,
            identifier: PropTypes.string.isRequired,
            timestamp: PropTypes.string.isRequired,
        })
    ).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default DraftOverlay;
