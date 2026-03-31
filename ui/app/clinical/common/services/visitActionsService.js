'use strict';

angular.module('bahmni.clinical')
    .factory('visitActionsService', ['printer', 'labOrderResultService', function (printer, labOrderResultService) {
        return {
            printPrescription: function (patient, visitDate, visitUuid, printParams) {
                printer.print('common/views/prescriptionPrint.html', {patient: patient, visitDate: visitDate, visitUuid: visitUuid, printParams: printParams});
            },
            downloadLabResults: function (patient, labOrderResults, accessionDateTime, accessionUuid, printParams) {
                var templateUrl = (printParams && printParams.templateUrl) ? printParams.templateUrl : 'common/views/labResultsPrint.html';
                printer.print(templateUrl, {
                    patient: patient,
                    labOrderResults: labOrderResultService.getReferredOutPrintableLabOrders(labOrderResults),
                    accessionDateTime: accessionDateTime,
                    accessionUuid: accessionUuid,
                    printParams: printParams
                });
            }};
    }]);
