import axios from "axios";
import { ENCOUNTER_BASE_URL } from "../../constants";
import { build } from "../FormDisplayControl/BuildFormView";

var findByEncounterUuid = async (encounterUuid) => {
  const apiURL = ENCOUNTER_BASE_URL.replace("{encounterUuid}", encounterUuid);
  const params = {
    includeAll: false,
  };
  try {
    const response = await axios.get(apiURL, { params });
    console.log("outside the encounter service --> ", response);
    if (response.status === 200) {
      console.log("Inside the encounter service --> ", response.data);
      return response.data.observations;
    }
    return [];
  } catch (error) {
    console.error(error);
  }
};

var getFormNameAndVersion = function (path) {
  var formNameAndVersion = path.split("/")[0].split(".");
  return {
    formName: formNameAndVersion[0],
    formVersion: formNameAndVersion[1],
  };
};

var fetchObservations = async (formMap) => {
  console.log("step1");
  var observations = await findByEncounterUuid(formMap.encounterUuid);
  console.log("step2 -> ", observations);
  var observationsForSelectedForm = [];
  observations.forEach(function (obs) {
    if (obs.formFieldPath) {
      var obsFormNameAndVersion = getFormNameAndVersion(obs.formFieldPath);
      if (obsFormNameAndVersion.formName === formMap.formName) {
        observationsForSelectedForm.push(obs);
      }
    }
  });
  console.log("step3");
  return await build(
    [{ value: observationsForSelectedForm }],
    formMap.hasNoHierarchy
  );
};

export const buildFormMap = async (formMap) => {
  var formMap1 = await fetchObservations(formMap);
  console.log("formMap1 -> ", formMap1);
  return formMap1;
};

export const subLabels = (subItem) => {
  let label = "";
  const { lowNormal, hiNormal } = subItem;
  if (lowNormal && hiNormal) {
    label = `(${lowNormal} - ${hiNormal})`;
  } else if (lowNormal && !hiNormal) {
    label = `(>${lowNormal})`;
  } else if (!lowNormal && hiNormal) {
    label = `(<${hiNormal})`;
  }
  return label;
};

export const isAbnormal = (interpretation) =>
  interpretation && interpretation.toUpperCase() === "ABNORMAL";