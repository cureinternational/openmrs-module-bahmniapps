import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Accordion, AccordionItem, Tooltip } from "carbon-components-react";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "./formDisplayControl.scss";
import { FormattedMessage } from "react-intl";
import {
  fetchFormData,
  getAllTasksForPatient,
  getLatestPublishedForms,
} from "../../utils/FormDisplayControl/FormUtils";
import {
  buildFormMap,
  findByEncounterUuid,
  doesUserHaveAccessToTheForm,
} from "../../utils/FormDisplayControl/FormView";
import { I18nProvider } from "../../Components/i18n/I18nProvider";
import ViewObservationForm from "../../Components/ViewObservationForm/ViewObservationForm";
import { formatDate } from "../../utils/utils";
import EditObservationForm from "../../Components/EditObservationForm/EditObservationForm";
import { FORM_APPROVAL, FORM_COMMENT, MAX_TASK_COUNT, PATIENT } from "../../constants";
import { Chat, CheckmarkFilled, ChevronDown, ChevronUp } from "@carbon/icons-react/next";

/** NOTE: for reasons known only to react2angular,
 * any functions passed in as props will be undefined at the start, even ones inside other objects
 * so you need to use the conditional operator like props.hostApi?.callback even though it is a mandatory prop
 */

export function FormDisplayControl(props) {
  const { appService } = props;
  
  const enableFormApprovalsAndComments = appService?.getAppDescriptor?.().getConfigValue("enableFormApprovalsAndComments");

  const noFormText = (
    <FormattedMessage
      id={"NO_FORM"}
      defaultMessage={"No Form found for this patient...."}
    />
  );
  const formsHeading = (
    <FormattedMessage
      id={props?.hostData?.sectionTitle || "DASHBOARD_TITLE_FORMS_2_DISPLAY_CONTROL_KEY"}
      defaultMessage={"Observation Forms"}
    />
  );
  const loadingMessage = (
    <FormattedMessage
      id={"LOADING_MESSAGE"}
      defaultMessage={"Loading... Please Wait"}
    />
  );

  const [formList, setFormList] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [showViewObservationForm, setViewObservationForm] = useState(false);
  const [showEditObservationForm, setEditObservationForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formNameTranslations, setFormNameTranslations] = useState("");
  const [formData, setFormData] = useState([]);
  const [isViewFormLoading, setViewFormLoading] = useState(false);
  const [isEditFormLoading, setEditFormLoading] = useState(false);
  const [encounterUuid, setEncounterUuid] = useState("");
  const [createdDateTime, setCreatedDateTime] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [formActions, setFormActions] = useState({});
  const [openAccordions, setOpenAccordions] = useState({});
  const [formActionsConceptIdMap, setFormActionsConceptIdMap] = useState({});

  const buildResponseData = async () => {
    try {
      let formResponseData = await fetchFormData(
        props?.hostData?.patientUuid,
        props?.hostData?.numberOfVisits
      );
      const forms = props?.hostData?.forms || [];
      if (forms.length > 0) {
        formResponseData = formResponseData.filter((form) =>
          forms.includes(form.formName)
        );
      }
      const latestForms = await getLatestPublishedForms();
      var grouped = {};
      if (formResponseData?.length > 0 && latestForms?.length > 0) {
        formResponseData.forEach(function (formEntry) {
          const latestForm = latestForms.find(
            (latestForm) => formEntry.formName == latestForm.name
          );
          grouped[formEntry.formName] = grouped[formEntry.formName] || [];
          grouped[formEntry.formName].push({
            encounterDate: formEntry.encounterDateTime,
            encounterUuid: formEntry.encounterUuid,
            visitUuid: formEntry.visitUuid,
            visitDate: formEntry.visitStartDateTime,
            providerName: formEntry.providers[0].providerName,
            providerUuid: formEntry.providers[0].uuid,
            formVersion: formEntry.formVersion,
            formNameTranslations: getFormDisplayName(latestForm),
            privileges: latestForm?.privileges,
          });
        });
      }
      Object.keys(grouped).forEach(function (key) {
        grouped[key] = grouped[key].sort((a, b) => {
          return new Date(b.encounterDate) - new Date(a.encounterDate);
        });
      });
      setFormList(grouped);
      setOpenAccordions(
        Object.keys(grouped).reduce((acc, key) => ({ ...acc, [key]: false }), {})
      );
    } catch (e) {
      console.log(e);
    }
  };

  const getFormDisplayName = function (form) {
    const locale = localStorage.getItem("NG_TRANSLATE_LANG_KEY") || "en";
    const formNameTranslations = form?.nameTranslation
      ? JSON.parse(form.nameTranslation)
      : [];
    let formDisplayName = form?.name;
    if (formNameTranslations.length > 0) {
      const currentLabel = formNameTranslations.find(function (
        formNameTranslation
      ) {
        return formNameTranslation.locale === locale;
      });
      formDisplayName = currentLabel ? currentLabel.display : form?.name;
    }
    return formDisplayName;
  };

  const showEdit = function (currentEncounterUuid) {
    return props?.hostData?.showEditForActiveEncounter
      ? props?.hostData?.encounterUuid === currentEncounterUuid
      : true;
  };

  const handleEditSave = (encounter) => {
    props?.hostApi?.handleEditSave(encounter);
  };

  const openViewObservationForm = async (
    formName,
    encounterUuid,
    formNameTranslations,
    encounterDate,
    providerName
  ) => {
    var formMap = {
      formName: formName,
      encounterUuid: encounterUuid,
      hasNoHierarchy: props?.hostData?.hasNoHierarchy,
    };
    setFormName(formName);
    setFormNameTranslations(formNameTranslations);
    setCreatedDateTime(formatDate(encounterDate));
    setCreatedBy(providerName);
    setViewFormLoading(true);
    setViewObservationForm(true);
    setEncounterUuid(encounterUuid);
    const data = await buildFormMap(formMap);
    setViewFormLoading(false);
    setFormData(data[0].value[0].groupMembers);
  };

  const openEditObservationForm = async (
    formName,
    encounterUuid,
    formNameTranslations
  ) => {
    var formMap = {
      formName: formName,
      encounterUuid: encounterUuid,
      hasNoHierarchy: props?.hostData?.hasNoHierarchy,
    };
    setEditFormLoading(true);
    setEditObservationForm(true);
    const data = await findByEncounterUuid(formMap.encounterUuid);
    const filteredFormObs = data.observations.filter((obs) =>
      obs.formFieldPath?.includes(formName)
    );
    setFormName(formName);
    setFormNameTranslations(formNameTranslations);
    setEncounterUuid(encounterUuid);
    setFormData(filteredFormObs);
  };

  const closeViewObservationForm = () => {
    setFormData([]);
    setFormName("");
    setFormNameTranslations("");
    setViewObservationForm(false);
  };
  const closeEditObservationForm = () => {
    setFormData([]);
    setFormName("");
    setFormNameTranslations("");
    setEditObservationForm(false);
  };

  const checkForPrivileges = (data, action) => {
    return doesUserHaveAccessToTheForm(
      props?.hostData?.currentUser?.privileges,
      data,
      action
    );
  };

  const printForm = () => {
    formData.map(function(obs) {
      if (obs?.groupMembers?.length > 0) {
        obs.encounterDateTime = obs?.groupMembers[0].encounterDateTime;
      }
    })
    props?.hostApi?.printForm(formData);
  };
  const allExpanded = Object.values(openAccordions).length > 0 && Object.values(openAccordions).every(Boolean);

  const toggleAllAccordions = () => {
    setOpenAccordions(
      Object.keys(openAccordions).reduce((acc, key) => ({ ...acc, [key]: !allExpanded }), {})
    );
  };

  const toggleAccordion = (key) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    buildResponseData();
  }, []);

  function handleFormActions(formActionsConceptIdMap) {
    getAllTasksForPatient({
      subject: `${PATIENT}/${props.hostData.patientUuid}`,
      _sort: "-_lastUpdated",
      code: `${formActionsConceptIdMap[FORM_APPROVAL]},${formActionsConceptIdMap[FORM_COMMENT]}`,
      _count: MAX_TASK_COUNT
    }).then((res) => {
      const result = (res.data.entry || []).reduce((acc, entry) => {
        const resource = entry.resource;
        const formName = resource.extension.find(
          (e) => e.url === "http://fhir.bahmni.org/ext/task/name"
        )?.valueString;
        const owner = resource.owner?.display;
        const codeType = resource.code?.text;
        const encounterUuid = resource.encounter?.reference?.split("/")[1];

        if (!formName || !codeType || !encounterUuid) return acc;

        if (!acc[formName]) acc[formName] = { comment: new Set(), approval: {} };

        if (codeType === FORM_APPROVAL) {
          if(acc[formName].approval?.[encounterUuid]){
            acc[formName].approval[encounterUuid].add(owner);
          }else{
            acc[formName].approval[encounterUuid] = new Set([owner]);
          }
        } else if (codeType === FORM_COMMENT) {
          acc[formName].comment.add(encounterUuid);
        }
        return acc;
      }, {});
      setFormActions(result);
    }).finally(() => {
      setLoading(false);
    })
  }

  useEffect(() => {
    const formActionsConceptIdMap = appService?.getAppDescriptor?.().getConfigValue("formActionsConceptIdMap");
    setFormActionsConceptIdMap(formActionsConceptIdMap);
    if(enableFormApprovalsAndComments) {
      handleFormActions(formActionsConceptIdMap);
    }
  }, [appService]);

  return (
    <>
      <I18nProvider>
        <div>
          <h2 className={"section-title-next-ui"}>
            {formsHeading}
            <div className={"form-display-control-accordion"} onClick={toggleAllAccordions} role="button">
              {allExpanded ? <ChevronUp /> : <ChevronDown />}
            </div>
          </h2>
          {isLoading ? (
            <div className="loading-message">{loadingMessage}</div>
          ) : (
            <div className={"placeholder-text-forms-control"}>
              {Object.entries(formList).length > 0
                ? Object.entries(formList).map(([key, value]) => {
                  const actions = formActions[key];
                  let hasActions = false, approvals = new Set(), comments = new Set();
                  if(actions){
                    const approvalList = Object.keys(actions.approval);
                    if(approvalList.length > 0) {
                      approvals = new Set(Object.keys(actions.approval));
                    }
                    if(actions.comment.size > 0){
                      comments = actions.comment;
                    }
                    hasActions = true;
                  }
                  return <Accordion>
                        <AccordionItem
                          title={<div className={"form-accordion-title"}>
                            <span className={"form-action-indicator"} style={{backgroundColor: hasActions ? "#198038" : "transparent"}}/>
                            {value[0].formNameTranslations}
                          </div>}
                          className={"form-accordion"}
                          open={openAccordions[key] ?? false}
                          onHeadingClick={() => toggleAccordion(key)}
                        >
                          {value.map((entry, index) => {
                            return (
                              <div key={index} className={"row-accordion"}>
                                <div className={"form-name-text"}>
                                  <div className={"form-approval-icon-container"}>
                                    {approvals.has(entry.encounterUuid) ? <Tooltip renderIcon={() => <CheckmarkFilled className="success-banner-icon"/>}>
                                      <div className={"form-approval-tooltip"}>
                                        <FormattedMessage id={"APPROVERS"} defaultMessage={"Approvers"}/>: <br/>
                                        <ul>
                                          {Array.from(actions.approval[entry.encounterUuid]).map(name => <li key={name}>{name}</li>)}
                                        </ul>
                                      </div>
                                    </Tooltip>: <></>}
                                  </div>
                                  {checkForPrivileges(entry, "view") ? (
                                    <a
                                      onClick={() =>
                                        openViewObservationForm(
                                          key,
                                          entry.encounterUuid,
                                          entry.formNameTranslations,
                                          entry.encounterDate,
                                          entry.providerName
                                        )
                                      }
                                      className="form-link"
                                    >
                                      {formatDate(entry.encounterDate)}
                                    </a>
                                  ) : (
                                    formatDate(entry.encounterDate)
                                  )}
                                  {comments.has(entry.encounterUuid) && <Chat />}
                                  {checkForPrivileges(entry, "edit") &&
                                    showEdit(entry.encounterUuid) && (
                                      props?.hostData?.draftFormNames?.includes(key) ? (
                                        <i
                                          className="fa fa-pencil pencil-disabled"
                                        ></i>
                                      ) : (
                                        <i
                                          className="fa fa-pencil"
                                          onClick={() => {
                                            openEditObservationForm(
                                              key,
                                              entry.encounterUuid,
                                              entry.formNameTranslations
                                            );
                                          }}
                                        ></i>
                                      )
                                    )}
                                </div>
                                <span className={"form-provider-text"}>
                                  {entry.providerName}
                                </span>
                              </div>
                            );
                          })}
                        </AccordionItem>
                      </Accordion>
                  })
                : <div className={"no-forms-message"}>
                  {noFormText}
              </div>}
              {showViewObservationForm ? (
                <ViewObservationForm
                  isViewFormLoading={isViewFormLoading}
                  formName={formName}
                  formNameTranslations={formNameTranslations}
                  closeViewObservationForm={closeViewObservationForm}
                  formData={formData}
                  showPrintOption={props?.hostData?.showPrintOption}
                  printForm={printForm}
                  createdDateTime={createdDateTime}
                  createdBy={createdBy}
                  currentProvider={props?.hostData?.currentProvider}
                  enableFormApprovalsAndComments={enableFormApprovalsAndComments}
                  encounterUuid={encounterUuid}
                  patient={props?.hostData?.patient}
                  formActionsConceptIdMap={formActionsConceptIdMap}
                  onAction={() => handleFormActions(formActionsConceptIdMap)}
                />
              ) : null}
              {showEditObservationForm ? (
                <EditObservationForm
                  isEditFormLoading={isEditFormLoading}
                  formName={formName}
                  formNameTranslations={formNameTranslations}
                  closeEditObservationForm={closeEditObservationForm}
                  patient={props?.hostData?.patient}
                  formData={formData != [] && formData}
                  encounterUuid={encounterUuid}
                  consultationMapper={props?.hostData?.consultationMapper}
                  handleEditSave={handleEditSave}
                  setEditFormLoading={setEditFormLoading}
                  editErrorMessage={props?.hostData?.editErrorMessage}
                />
              ) : null}
            </div>
          )}
        </div>
      </I18nProvider>
    </>
  );
}

FormDisplayControl.propTypes = {
  hostData: PropTypes.object.isRequired,
  hostApi: PropTypes.object.isRequired,
  appService: PropTypes.object,
};