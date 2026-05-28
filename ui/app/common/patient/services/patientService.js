'use strict';

angular.module('bahmni.common.patient')
    .service('patientService', ['$http', '$q', 'sessionService', 'appService', function ($http, $q, sessionService, appService) {
        this.getPatient = function (uuid, rep) {
            if (!rep) {
                rep = "full";
            }
            var patient = $http.get(Bahmni.Common.Constants.openmrsUrl + "/ws/rest/v1/patient/" + uuid, {
                method: "GET",
                params: {v: rep},
                withCredentials: true
            });
            return patient;
        };

        this.getRelationships = function (patientUuid) {
            return $http.get(Bahmni.Common.Constants.openmrsUrl + "/ws/rest/v1/relationship", {
                method: "GET",
                params: {person: patientUuid, v: "full"},
                withCredentials: true
            });
        };

        this.findPatients = function (params) {
            return $http.get(Bahmni.Common.Constants.sqlUrl, {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };

        this.search = function (query, offset, identifier) {
            offset = offset || 0;
            identifier = identifier || query;
            var searchParams = {
                filterOnAllIdentifiers: true,
                q: query,
                startIndex: offset,
                identifier: identifier,
                loginLocationUuid: sessionService.getLoginLocationUuid()
            };
            var filterOutAttributeForAllSearch = appService.getAppDescriptor().getConfigValue("filterOutAttributeForAllSearch") || [];
            if (filterOutAttributeForAllSearch && filterOutAttributeForAllSearch.length > 0) {
                searchParams.attributeToFilterOut = filterOutAttributeForAllSearch[0].attrName;
                searchParams.attributeValueToFilterOut = filterOutAttributeForAllSearch[0].attrValue;
            }
            return $http.get(Bahmni.Common.Constants.bahmniCommonsSearchUrl + "/patient/lucene", {
                method: "GET",
                params: searchParams,
                withCredentials: true
            });
        };

        this.getPatientContext = function (patientUuid, programUuid, personAttributes, programAttributes, patientIdentifiers) {
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/patientcontext', {
                params: {
                    patientUuid: patientUuid,
                    programUuid: programUuid,
                    personAttributes: personAttributes,
                    programAttributes: programAttributes,
                    patientIdentifiers: patientIdentifiers
                },
                withCredentials: true
            });
        };

        this.calculateDaysSinceLmp = function (lmpDateStr) {
            if (!lmpDateStr || !angular.isString(lmpDateStr)) {
                return null;
            }

            var lmpDate = new Date(lmpDateStr);
            if (isNaN(lmpDate.getTime())) {
                return null;
            }

            var today = new Date();
            lmpDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            if (lmpDate > today) {
                return null;
            }

            var daysMs = today.getTime() - lmpDate.getTime();
            return Math.floor(daysMs / (24 * 60 * 60 * 1000));
        };

        this.getPatientLmpData = function (patientUuid, conceptName) {
            var self = this;

            if (!patientUuid || !angular.isString(patientUuid)) {
                return $q.when(null);
            }

            var resolvedConceptName = conceptName || Bahmni.Common.Constants.lmpConceptName;
            var url = Bahmni.Common.Constants.openmrsObsUrl + "?patient=" + patientUuid + "&concept=" + encodeURIComponent(resolvedConceptName) + "&limit=1";

            return $http.get(url, {
                withCredentials: true
            }).then(function (response) {
                if (!response.data || !response.data.results || response.data.results.length === 0) {
                    return null;
                }

                var lmpObs = response.data.results[0];
                var lmpDateStr = lmpObs.value || lmpObs.valueText;

                if (!lmpDateStr && lmpObs.display) {
                    var displayMatch = lmpObs.display.match(/(\d{4}-\d{2}-\d{2})/);
                    if (displayMatch && displayMatch[1]) {
                        lmpDateStr = displayMatch[1];
                    }
                }

                if (!lmpDateStr) {
                    return null;
                }

                var daysSinceLmp = self.calculateDaysSinceLmp(lmpDateStr);

                if (daysSinceLmp === null) {
                    return null;
                }

                return {
                    lmpDate: lmpDateStr,
                    daysSinceLmp: daysSinceLmp
                };
            }).catch(function () {
                return null;
            });
        };
    }]);
