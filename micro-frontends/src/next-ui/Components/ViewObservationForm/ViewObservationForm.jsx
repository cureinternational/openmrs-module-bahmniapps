import React, { useState, useEffect, useRef } from "react";
import { Modal, Tile, Loading, Button } from "carbon-components-react";
import propTypes from "prop-types";
import { Document, CheckmarkFilled } from "@carbon/icons-react/next";
import { useIntl } from "react-intl";
import { I18nProvider } from "../i18n/I18nProvider";
import moment from "moment";

import TileItem from "./TileItem/TileItem";
import { NotificationCarbon } from "bahmni-carbon-ui";
import {
  subLabels,
  isAbnormal,
  getValue,
  isValidFileFormat,
} from "../../utils/FormDisplayControl/FormView";

import "./viewObservationForm.scss";
import { FileViewer } from "./FileViewer/FileViewer";
import CommentPanel from "./CommentPanel/CommentPanel";
import { getAllTasksForForm, saveTask } from "../../utils/FormDisplayControl/FormUtils";
import { ENCOUNTER, FORM_APPROVAL, FORM_COMMENT, PATIENT, PRACTITIONER } from "../../constants";

export const ViewObservationForm = (props) => {
  const intl = useIntl();
  const {
    formName,
    formNameTranslations,
    closeViewObservationForm,
    formData,
    isViewFormLoading,
    showPrintOption,
    printForm,
    createdDateTime,
    createdBy,
    currentUser,
    enableFormApprovalsAndComments,
    encounterUuid,
    patient,
    formActionsConceptIdMap,
  } = props;

  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [actionsHistory, setActionsHistory] = useState([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showConfirmationBanner, setShowConfirmationBanner] = useState(false);
  const [showApprovalNotification, setShowApprovalNotification] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [approvedFormName, setApprovedFormName] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const taskPayload = {
    resourceType: "Task",
    status: "completed",
    intent: "order",
    extension: [{
      "url": "http://fhir.bahmni.org/ext/task/name",
      "valueString": formName,
    }],
    for: {
      "reference": `${PATIENT}/${patient.uuid}`,
      "type": PATIENT
    },
    encounter: {"reference": `${ENCOUNTER}/${encounterUuid}`, "type": ENCOUNTER},
    owner: {"reference": `${PRACTITIONER}/${currentUser.uuid}`, "type": PRACTITIONER},
  }
  const scrollableContentRef = useRef(null);

  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);

  useEffect(() => {
    getAllTasks()
      .then(() => {setIsHistoryLoading(false)})
      .catch((err) => {
        console.error("Error fetching actions history", err);
        setIsHistoryLoading(false);
      });
  }, []);

  useEffect(() => {
    setShowSuccessBanner(false);
    if (showApprovalNotification) {
      setShowApprovalNotification(false);
      setApprovedFormName("");
      setIsModalOpen(true);
    }
  }, [formData]);

  useEffect(() => {
    if (actionsHistory.length > 0 && scrollableContentRef.current) {
      setTimeout(() => {
        scrollableContentRef.current.scrollTop = scrollableContentRef.current.scrollHeight;
      }, 0);
    }
  }, [actionsHistory]);

  const imageItems = formData?.filter((member) => isValidFileFormat(member));

  const handleCommentClick = () => {
    setIsCommentPanelOpen(true);
    setShowSuccessBanner(false);
  };

  const handleCloseCommentPanel = () => {
    setIsCommentPanelOpen(false);
    setShowSuccessBanner(false);
  };

  const handleApproveClick = () => {
    setShowSuccessBanner(false);
    setShowConfirmationBanner(true);
  };

  const handleConfirmationCancel = () => {
    setShowConfirmationBanner(false);
  };

  const handleConfirmationSubmit = () => {
    setIsHistoryLoading(true);
    approve()
      .then(() => {
        setShowConfirmationBanner(false);
        setIsModalOpen(false);
        setApprovedFormName(formNameTranslations);
        setShowApprovalNotification(true);
      }).catch((e) => {
      console.error("Error approving the form", e);
    }).finally(() => {
      setIsHistoryLoading(false);
    });
  };

  const handleSaveComment = (commentText) => {
    saveComment(commentText)
      .then(() => {
        setIsCommentPanelOpen(false);
        setShowSuccessBanner(true);
      }).then(getAllTasks).catch(() => {
      console.log("Error saving comment");
    }).finally(() => {
      setIsHistoryLoading(false);
    })
  };

  const saveComment = async (commentText) => {
    setIsHistoryLoading(true);
    const payload = {
      ...taskPayload,
      code: {
        coding: [{
          code: formActionsConceptIdMap[FORM_COMMENT]
        }]
      },
      note: [{"text": commentText}]
    }
    return await saveTask(payload);
  }

  const approve = async () => {
    setIsHistoryLoading(true);
    const payload = {
      ...taskPayload,
      code: {
        coding: [{
          code: formActionsConceptIdMap[FORM_APPROVAL]
        }]
      },
    }
    return await saveTask(payload);
  }

  const getAllTasks = async () => {
    setIsHistoryLoading(true);
    const data = await getAllTasksForForm(formName, encounterUuid);
    const actions = data?.entry?.reduce((acc, {resource}) => {
      if(resource.code && [FORM_COMMENT, FORM_APPROVAL].includes(resource.code.text))
        acc.push({
          action:   resource.code?.text,
          username: resource.owner?.display,
          dateTime: moment(resource.authoredOn).format("DD MMM YYYY HH:mm a"),
          comment:  resource.note?.[0]?.text
        });
      return acc;
    },[]);
    setActionsHistory(actions || []);
  }

  return (
    <I18nProvider>
      <div>
        <Modal
        open={isModalOpen}
        passiveModal
        className="view-observation-form-modal"
        onRequestClose={closeViewObservationForm}
      >
        {showPrintOption && (
          <button className="confirm print-button" onClick={printForm}>
            Print
          </button>
        )}
        <h2 className="section-title">{formNameTranslations}</h2>
        <div className="scrollable-content" ref={scrollableContentRef}>
          <section className="content-body">
          {isViewFormLoading || isHistoryLoading ? (
            <div>
              <Loading />
            </div>
          ) : (
            <section className="section-body">
              {imageItems?.length > 0 && (
                <FileViewer members={imageItems} isHeader={true} />
              )}
              {formData.map((section, index) => {
                if (!isValidFileFormat(section)) {
                  return (
                    <Tile key={index}>
                      <div
                        style={{
                          display: section?.groupMembers?.length
                            ? "block"
                            : "flex",
                        }}
                      >
                        <span
                          className={`section-header ${
                            section?.groupMembers?.length ? "" : "row-label"
                          } ${
                            isAbnormal(section.interpretation)
                              ? "is-abnormal"
                              : ""
                          }`}
                          data-testid={`section-label-${index}`}
                        >
                          {section.concept.shortName}&nbsp;
                          <span className="sub-label">
                            {subLabels(section.concept)}
                          </span>
                        </span>
                        {section?.groupMembers?.length ? (
                          <TileItem items={section.groupMembers} />
                        ) : (
                          <div
                            className={`row-value ${
                              isAbnormal(section.interpretation)
                                ? "is-abnormal"
                                : ""
                            }`}
                          >
                            {getValue(section)}
                            &nbsp;{section.concept.units || ""}
                          </div>
                        )}
                      </div>
                      {section.comment && (
                        <span className="notes-section">
                          <Document className="document-icon" />
                          {`${section.comment} - by ${
                            (section.providers && section.providers[0]?.name) ||
                            ""
                          }`}
                        </span>
                      )}
                    </Tile>
                  );
                }
              })}

              <Tile className="actions-section">
                <h3 className="actions-title">
                  {intl.formatMessage({ id: "ACTIONS", defaultMessage: "Actions" })}
                </h3>
                <table className="actions-table">
                  <thead>
                    <tr>
                      <th>{intl.formatMessage({ id: "ACTION", defaultMessage: "Action" })}</th>
                      <th>{intl.formatMessage({ id: "DATE_TIME", defaultMessage: "Date & Time" })}</th>
                      <th>{intl.formatMessage({ id: "PROVIDER", defaultMessage: "Provider" })}</th>
                      <th>{intl.formatMessage({ id: "COMMENTS_COLUMN", defaultMessage: "Comments" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionsHistory && actionsHistory.length > 0 &&
                      actionsHistory.map((action, index) => (
                        <tr key={index}>
                          <td>{intl.formatMessage({ id: action.action, defaultMessage: "Action" })}</td>
                          <td>{action.dateTime}</td>
                          <td>{action.username}</td>
                          <td>{action.comment || "-"}</td>
                        </tr>
                      ))
                    }
                    <tr className="creation-row">
                      <td>{intl.formatMessage({ id: "CREATION", defaultMessage: "Creation" })}</td>
                      <td>{createdDateTime}</td>
                      <td>{createdBy}</td>
                      <td>-</td>
                    </tr>
                  </tbody>
                </table>
              </Tile>
            </section>
          )}
        </section>
        </div>
        {enableFormApprovalsAndComments && (
          <>
            {!isCommentPanelOpen && !showConfirmationBanner && (
              <div className="action-buttons">
                <Button
                  kind="primary"
                  onClick={handleApproveClick}
                  className="btn-approve"
                >
                  {intl.formatMessage({ id: "APPROVE", defaultMessage: "Approve" })}
                </Button>
                <Button
                  kind="secondary"
                  onClick={handleCommentClick}
                  className="btn-comment"
                >
                  {intl.formatMessage({ id: "COMMENT", defaultMessage: "Comment" })}
                </Button>
              </div>
            )}

            {isCommentPanelOpen && (
              <CommentPanel
                onClose={handleCloseCommentPanel}
                onSaveComment={handleSaveComment}
              />
            )}

            {showSuccessBanner && (
              <div className="success-banner-modal">
                <CheckmarkFilled className="success-banner-icon" />
                <span className="success-banner-text">
                  {intl.formatMessage({ id: "COMMENT_ADDED_SUCCESSFULLY", defaultMessage: "Comment added successfully!" })}
                </span>
              </div>
            )}

            {showConfirmationBanner && (
              <div className="confirmation-banner-modal">
                <div className="confirmation-left">
                  <h3 className="confirmation-heading">
                    {intl.formatMessage({ id: "CONFIRMATION", defaultMessage: "Confirmation" })}
                  </h3>
                  <p className="confirmation-text">
                    {intl.formatMessage({ id: "APPROVE_FORM_CONFIRMATION", defaultMessage: "Do you want to proceed with approving this form?" })}
                  </p>
                </div>
                <div className="confirmation-actions">
                  <Button
                    kind="secondary"
                    onClick={handleConfirmationCancel}
                    className="confirmation-cancel"
                  >
                    {intl.formatMessage({ id: "CANCEL", defaultMessage: "Cancel" })}
                  </Button>
                  <Button
                    kind="primary"
                    onClick={handleConfirmationSubmit}
                    className="confirmation-submit"
                  >
                    {intl.formatMessage({ id: "SUBMIT", defaultMessage: "Submit" })}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {enableFormApprovalsAndComments && showApprovalNotification && (
        <NotificationCarbon
          messageDuration={3000}
          onClose={() => {
            setShowApprovalNotification(false);
            setApprovedFormName("");
            closeViewObservationForm();
          }}
          showMessage={showApprovalNotification}
          kind="success"
          title={intl.formatMessage(
            { id: "APPROVED_SUCCESSFULLY", defaultMessage: "{formName} approved successfully" },
            { formName: approvedFormName }
          )}
          hideCloseButton={true}
        />
      )}
      </div>
    </I18nProvider>
  );
};

ViewObservationForm.propTypes = {
  formName: propTypes.string,
  formNameTranslations: propTypes.string,
  closeViewObservationForm: propTypes.func,
  formData: propTypes.array,
  isViewFormLoading: propTypes.bool,
  showPrintOption: propTypes.bool,
  printForm: propTypes.func,
  createdDateTime: propTypes.string,
  createdBy: propTypes.string,
  currentUser: propTypes.object,
  enableFormApprovalsAndComments: propTypes.bool,
  formActionsConceptIdMap: propTypes.object,
  encounterUuid: propTypes.string,
  patient: propTypes.object,
};
export default ViewObservationForm;
