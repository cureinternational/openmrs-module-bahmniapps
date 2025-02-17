import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "./patientAllergiesControl.scss";
import { AddAllergy } from "../../Components/AddAllergy/AddAllergy";
import { FormattedMessage } from "react-intl";
import {
  fetchAllergensOrReactions,
  fetchAllergiesAndReactionsForPatient
} from "../../utils/PatientAllergiesControl/AllergyControlUtils";
import { ViewAllergiesAndReactions } from "../../Components/ViewAllergiesAndReactions/ViewAllergiesAndReactions";
import { I18nProvider } from "../../Components/i18n/I18nProvider";
import { NotificationCarbon } from "bahmni-carbon-ui";
import { allergyError, getErrorKey } from "../../errorMessages";

/** NOTE: for reasons known only to react2angular,
 * any functions passed in as props will be undefined at the start, even ones inside other objects
 * so you need to use the conditional operator like props.hostApi?.callback even though it is a mandatory prop
 */

const AllergenKind = {
  DRUG: "Drug",
  FOOD: "Food",
  ENVIRONMENT: "Environment",
  OTHER: "Other",
};
export function PatientAlergiesControl(props) {
  const { hostData, appService } = props;
  const { patient, provider, activeVisit, allergyControlConceptIdMap } = hostData;

  const isAddButtonEnabled = activeVisit && activeVisit.uuid;

  const extractAllergenData = (allergenData, allergenKind) =>
    allergenData?.setMembers
      ?.filter((allergen) => allergen.display !== "Other non-coded")
      .map((allergen) => {
        return {
          name: allergen.display,
          kind: allergenKind,
          uuid: allergen.uuid,
        };
      });

  const extractReactionData = (reactionData) =>
    reactionData?.setMembers
      ?.filter((reaction) => reaction.display !== "Other non-coded")
      .map((reaction) => {
        return { name: reaction.name.display, uuid: reaction.uuid };
      });

  const TransformReactionData = (reactionData) => {
    const extractedReactionData = extractReactionData(reactionData, "Reaction");
    const reactions = {};

    extractedReactionData.forEach((item) => {
      reactions[item.uuid] = { name: item.name };
    });
    return reactions;
  };

  const TransformSeverityData = (severityData) => {
    const {setMembers, answers} = severityData;
    const severities = setMembers.length > 0 ? setMembers: answers;
    return severities.map((severity) =>
        ({name: severity.display, uuid: severity.uuid}));
  }

  const TransformAllergenData = (
    medicationAllergenData,
    foodAllergenData,
    environmentAllergenData,
    otherAllergenData
  ) => {
    const medicationAllergens = extractAllergenData(
      medicationAllergenData,
      AllergenKind.DRUG
    );
    const environmentalAllergens = extractAllergenData(
      environmentAllergenData,
      AllergenKind.ENVIRONMENT
    );
    const foodAllergens = extractAllergenData(
      foodAllergenData,
      AllergenKind.FOOD
    );
    const otherAllergens = extractAllergenData(
      otherAllergenData,
      AllergenKind.OTHER
    );

    return [
      ...medicationAllergens,
      ...environmentalAllergens,
      ...foodAllergens,
      ...otherAllergens,
    ];
  };

  const allergiesAndReactionsForPatient = async () => {
    const allergiesAndReactions = await fetchAllergiesAndReactionsForPatient(patient.uuid);
    const allergies = allergiesAndReactions.entry;
    const allergiesData = allergies?.map((allergy) => {
      const { resource } = allergy;
      const allergen = resource.reaction[0]?.substance?.coding?.[0].display;
      const severity = resource.reaction[0].severity;
      const note = resource.note && resource.note[0].text;
      const date = new Date(resource.recordedDate);
      const provider = resource.recorder?.display;
      const reactions = resource.reaction[0]?.manifestation.map((reaction) => {
        return reaction.coding[0].display;
      });
      return {allergen, severity, reactions, note, provider, date};
    });
    allergiesData && allergiesData.sort((a, b) => b?.date - a?.date);
    const filterSeverity = (severity) =>
      allergiesData.filter((allergy) => allergy.severity === severity);
    allergiesData
      ? setAllergiesAndReactions([
          ...filterSeverity("severe"),
          ...filterSeverity("moderate"),
          ...filterSeverity("mild"),
        ])
      : setAllergiesAndReactions([]);
  };

  const [showAddAllergyPanel, setShowAddAllergyPanel] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [transformedAllergenData, setTransformedAllergenData] = useState([]);
  const [transformedReactionData, setTransformedReactionData] = useState({});
  const [transformedSeverityData, setTransformedSeverityData] = useState([]);
  const [allergiesAndReactions, setAllergiesAndReactions] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [error, setError] = useState('');

  const noAllergiesText = (
    <FormattedMessage
      id={"NO_ALLERGIES"}
      defaultMessage={"No Allergies for this patient."}
    />
  );
  const allergiesHeading = (
    <FormattedMessage id={"ALLERGIES_DISPLAY_CONTROL_HEADING"} defaultMessage={"Allergies"} />
  );
  const addButtonText = (
    <FormattedMessage id={"ADD_BUTTON_TEXT"} defaultMessage={"Add +"} />
  );
  const loadingMessage = (
    <FormattedMessage
      id={"LOADING_MESSAGE"}
      defaultMessage={"Loading... Please Wait"}
    />
  );

  const buildAllergenAndReactionsData = async () => {
    const urls = [
      allergyControlConceptIdMap.medicationAllergenUuid,
      allergyControlConceptIdMap.foodAllergenUuid,
      allergyControlConceptIdMap.environmentalAllergenUuid,
      allergyControlConceptIdMap.otherAllergenUuid,
      allergyControlConceptIdMap.allergyReactionUuid,
      allergyControlConceptIdMap.allergySeverityUuid
    ];

    try {
      setLoading(true);
      const [
        medicationResponseData,
        foodResponseData,
        environmentalResponseData,
        otherResponseData,
        reactionResponseData,
        severityResponseData
      ] = await Promise.all(urls.map((url) => fetchAllergensOrReactions(url)));
      const allergenData = TransformAllergenData(
        medicationResponseData,
        foodResponseData,
        environmentalResponseData,
        otherResponseData
      );
      const reactionsData = TransformReactionData(reactionResponseData);

      const severityData = TransformSeverityData(severityResponseData);

      setTransformedAllergenData(allergenData);
      setTransformedReactionData(reactionsData);
      setTransformedSeverityData(severityData);
      setLoading(false);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buildAllergenAndReactionsData();
    allergiesAndReactionsForPatient();
  }, []);

  return (
    <>
      <I18nProvider>
      {isLoading ? (
        <div>{loadingMessage}</div>
      ) : (
        <div>
          <h2 className={"section-title-next-ui"}>
            {allergiesHeading}
            {isAddButtonEnabled && (
              <div
                className={"add-button"}
                onClick={() => {
                  setShowAddAllergyPanel(true);
                }}
              >
                {addButtonText}
              </div>
            )}
          </h2>
            {allergiesAndReactions.length === 0 ?<div className={"placeholder-text"}>{noAllergiesText}</div>:
                <ViewAllergiesAndReactions allergies={allergiesAndReactions} showTextAsAbnormal={appService.getAppDescriptor().getConfigValue("showTextAsAbnormal")}/>
            }
          { showAddAllergyPanel && (
            <AddAllergy
              reaction={transformedReactionData}
              allergens={transformedAllergenData}
              severityOptions={transformedSeverityData}
              patient={patient}
              provider={provider}
              data-testid={"allergies-overlay"}
              onClose={() => {
                setShowAddAllergyPanel(false);
              }}
              onSave={async (isSaveSuccess, error) => {
                if(isSaveSuccess){
                  setShowSuccessPopup(true);
                  setShowAddAllergyPanel(false);
                }
                else if(isSaveSuccess === false){
                  setError(getErrorKey(error));
                  setShowErrorPopup(true);
                }
              }}
            />
          )}
          <NotificationCarbon messageDuration={3000} onClose={()=>{setShowSuccessPopup(false); window.location.reload()}} showMessage={showSuccessPopup} kind={"success"} title={<FormattedMessage id={"ALLERGY_SAVED_SUCCESS"} defaultMessage="Allergy saved successfully"/>} hideCloseButton={true}/>
          <NotificationCarbon messageDuration={3000} onClose={()=>{setShowErrorPopup(false);}} showMessage={showErrorPopup} kind={"error"} title={allergyError[error?.trim()] ?? <FormattedMessage id={"ERROR_SAVING_ALLERGY"} defaultMessage="Error saving allergy"/>} hideCloseButton={true}/>
        </div>
      )}
      </I18nProvider>
    </>
  );
}

PatientAlergiesControl.propTypes = {
  hostData: PropTypes.object.isRequired,
  appService: PropTypes.object.isRequired,
};
