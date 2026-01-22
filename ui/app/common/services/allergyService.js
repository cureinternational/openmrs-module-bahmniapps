'use strict';

angular.module('bahmni.common.util')
    .factory('allergyService', ['$http', 'appService', function ($http, appService) {
        const getAllergyForPatient = function (patientUuid) {
            const patientAllergyURL = appService.getAppDescriptor().formatUrl(Bahmni.Common.Constants.patientAllergiesURL, {'patientUuid': patientUuid});
            return $http.get(patientAllergyURL, {
                method: "GET",
                withCredentials: true,
                cache: false
            });
        };

        const getNoKnownAllergyUuid = function () {
            return $http.get(Bahmni.Common.Constants.globalPropertyUrl, {
                method: "GET",
                params: {
                    property: 'allergy.concept.noKnownAllergyUuid'
                },
                withCredentials: true,
                headers: {
                    Accept: 'text/plain'
                }
            }).then(function (response) {
                return response.data;
            });
        };

        return {
            getAllergyForPatient: getAllergyForPatient,
            getNoKnownAllergyUuid: getNoKnownAllergyUuid
        };
    }]);
