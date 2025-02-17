'use strict';

angular.module('bahmni.clinical')
    .directive('newDrugOrders', ['messagingService', function (messagingService) {
        var controller = function ($scope, $rootScope, $stateParams, appService, visitService) {
            $scope.allMedicinesInPrescriptionAvailableForIPD = appService.getAppDescriptor().getConfigValue("allMedicinesInPrescriptionAvailableForIPD") !== null ? appService.getAppDescriptor().getConfigValue("allMedicinesInPrescriptionAvailableForIPD") : true;
            if (!$scope.allMedicinesInPrescriptionAvailableForIPD) {
                $rootScope.$on("event:setEncounterId", function (event, encounterId) {
                    $scope.encounterId = encounterId;
                });

                $scope.toggleCareSetting = function (newTreatment) {
                    newTreatment.careSetting = newTreatment.careSetting === Bahmni.Clinical.Constants.careSetting.inPatient ? Bahmni.Clinical.Constants.careSetting.outPatient : Bahmni.Clinical.Constants.careSetting.inPatient;
                };

                $scope.shouldDisableIPDButton = function (treatment) {
                    return $scope.encounterId !== treatment.encounterUuid && treatment.encounterUuid !== undefined;
                };
            }
            $scope.edit = function (drugOrder, index) {
                $rootScope.$broadcast("event:editDrugOrder", drugOrder, index);
            };
            $scope.remove = function (index) {
                $rootScope.$broadcast("event:removeDrugOrder", index);
            };
            var defaultBulkDuration = function () {
                return {
                    bulkDurationUnit: $scope.treatmentConfig.durationUnits ? $scope.treatmentConfig.durationUnits[0].name : ""
                };
            };

            $scope.bulkDurationData = defaultBulkDuration();

            var clearBulkDurationChange = function () {
                $scope.bulkDurationData = defaultBulkDuration();
                $scope.bulkSelectCheckbox = false;
            };

            $scope.bulkDurationChangeDone = function () {
                if ($scope.bulkDurationData.bulkDuration && $scope.bulkDurationData.bulkDurationUnit) {
                    $scope.treatments.forEach(function (treatment) {
                        if (treatment.durationUpdateFlag) {
                            if (!treatment.duration) {
                                treatment.quantityEnteredManually = false;
                            }
                            treatment.duration = $scope.bulkDurationData.bulkDuration;
                            treatment.durationUnit = $scope.bulkDurationData.bulkDurationUnit;
                            treatment.calculateDurationInDays();
                            treatment.calculateQuantityAndUnit();
                        }
                    });
                }
                clearBulkDurationChange();
                $scope.bulkChangeDuration();
            };

            var isDurationNullForAnyTreatment = function (treatments) {
                var isDurationNull = false;
                treatments.forEach(function (treatment) {
                    if (!treatment.duration) {
                        isDurationNull = true;
                    }
                });
                return isDurationNull;
            };

            var setNonCodedDrugConcept = function (treatment) {
                if (treatment.drugNonCoded) {
                    treatment.concept = $scope.treatmentConfig.nonCodedDrugconcept;
                }
            };

            $scope.selectAllCheckbox = function () {
                $scope.bulkSelectCheckbox = !$scope.bulkSelectCheckbox;
                $scope.treatments.forEach(function (treatment) {
                    setNonCodedDrugConcept(treatment);
                    treatment.durationUpdateFlag = $scope.bulkSelectCheckbox;
                });
            };

            $scope.bulkChangeDuration = function () {
                $scope.showBulkChangeToggle = !$scope.showBulkChangeToggle;
                clearBulkDurationChange();
                $scope.selectAllCheckbox();
                if ($scope.showBulkChangeToggle) {
                    if (isDurationNullForAnyTreatment($scope.treatments)) {
                        messagingService.showMessage("info", "UPDATE_DURATION_OF_THE_DRUGS_MESSAGE");
                    }
                }
            };

            $scope.showBulkChangeDuration = $scope.treatmentConfig.showBulkChangeDuration();

            $scope.updateDuration = function (stepperValue) {
                if (!$scope.bulkDurationData.bulkDuration && isNaN($scope.bulkDurationData.bulkDuration)) {
                    $scope.bulkDurationData.bulkDuration = 0;
                }
                $scope.bulkDurationData.bulkDuration += stepperValue;
            };
        };
        return {
            templateUrl: 'consultation/views/newDrugOrders.html',
            scope: {
                treatments: "=",
                treatmentConfig: "="

            },
            controller: controller
        };
    }]);
