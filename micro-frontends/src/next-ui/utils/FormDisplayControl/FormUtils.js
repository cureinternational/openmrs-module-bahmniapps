import axios from "axios";
import { FHIR_URL, FORM_BASE_URL, LATEST_PUBLISHED_FORMS_URL } from "../../constants";

export const fetchFormData = async (patientUuid, numberOfVisits) => {
  const apiURL = FORM_BASE_URL.replace('{patientUuid}',patientUuid);
  const params = {
    formType: 'v2',
  }
  if(numberOfVisits){
    params['numberOfVisits'] = numberOfVisits;
  }
  try {
    const response = await axios.get(apiURL, { params });
    if(response.status === 200){
        return response.data;
    }
  } catch (error) {
    console.error(error);
  }
};

export const getLatestPublishedForms = async (encounterUuid) => {
  const apiURL = LATEST_PUBLISHED_FORMS_URL;
  const params = {
      encounterUuid: encounterUuid,
  };
  try {
      const response = await axios.get(apiURL, { params });
      if (response.status === 200) {
          return response.data;
      }
      return [];
  } catch (error) {
      return error;
  }
};

export const saveTask = async (payload) => {
  try{
    const response = await axios.post(FHIR_URL, payload);
    if (response.status === 201) {
      return response.data;
    }
  }catch(error){
    console.error("Error saving Task:", error);
  }
}

export const getAllTasksForForm = async (formName, encounterUuid) => {
  try{
    const response = await axios.get(FHIR_URL, {
      params: {
        encounter: encounterUuid,
        name:formName,
        _sort:"-_lastUpdated"
      }}
    )
    if(response.status === 200){
      return response.data;
    }
  }catch(error){
    console.error("Error fetching Tasks:", error);
  }
}