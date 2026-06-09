'use strict';

angular.module('bahmni.clinical')
    .factory('visitActionsService', ['$http', 'printer', 'labOrderResultService', 'appService', function ($http, printer, labOrderResultService, appService) {
        var fetchExtraIdentifiers = function (patient) {
            var primaryIdentifierTypeUuid = appService.getAppDescriptor().getConfigValue('primaryIdentifierTypeUuid');
            return $http.get('/openmrs/ws/rest/v1/patient/' + patient.uuid + '/identifier', {
                params: { v: 'full' }
            }).then(function (response) {
                patient.extraIdentifiers = (response.data.results || [])
                    .filter(function (id) { return !id.voided; })
                    .map(function (id) {
                        return {
                            identifier: id.identifier,
                            preferred: id.preferred,
                            voided: id.voided,
                            identifierType: {
                                uuid: id.identifierType.uuid,
                                name: id.identifierType.display || id.identifierType.name,
                                display: id.identifierType.display || id.identifierType.name
                            }
                        };
                    })
                    .filter(function (id) {
                        return id.identifierType.uuid !== primaryIdentifierTypeUuid;
                    });
            });
        };
        return {
            printPrescription: function (patient, visitDate, visitUuid, printParams) {
                fetchExtraIdentifiers(patient).then(function () {
                    printer.print('common/views/prescriptionPrint.html', {patient: patient, visitDate: visitDate, visitUuid: visitUuid, printParams: printParams});
                });
            },
            downloadLabResults: function (patient, labOrderResults, accessionDateTime, accessionUuid, printParams) {
                var templateUrl = (printParams && printParams.templateUrl) ? printParams.templateUrl : 'common/views/labResultsPrint.html';
                fetchExtraIdentifiers(patient).then(function () {
                    printer.print(templateUrl, {
                        patient: patient,
                        labOrderResults: labOrderResultService.getReferredOutPrintableLabOrders(labOrderResults),
                        accessionDateTime: accessionDateTime,
                        accessionUuid: accessionUuid,
                        printParams: printParams
                    });
                });
            }
        };
    }]);
