'use strict';

angular.module('bahmni.clinical')
.controller('cdssAlertRowController', ['$scope', '$rootScope', '$stateParams', 'appService', 'drugService', function ($scope, $rootScope, $stateParams, appService, drugService) {
    var sortInteractionsByStatus = function (arr) {
        var order = { "critical": 0, "warning": 1, "info": 2 };
        return arr.sort(function (a, b) {
            return order[a.indicator] - order[b.indicator];
        });
    };

    var matchAlertsForDrug = function (drug) {
        var cdssAlerts = angular.copy($rootScope.cdssAlerts);
        if (!cdssAlerts || !drug) return [];
        var matchedAlerts = cdssAlerts.filter(function (cdssAlert) {
            return Bahmni.Clinical.CdssAlertUtil.matchesMedication(cdssAlert, drug);
        });
        return sortInteractionsByStatus(matchedAlerts);
    };

    var getPreviousDrugAlerts = function () {
        var drugOrderGroups = $scope.consultation ? $scope.consultation.drugOrderGroups : [];
        if (drugOrderGroups && drugOrderGroups.length > 0) {
            drugOrderGroups.forEach(function (order) {
                var drugOrders = order.drugOrders;
                drugOrders && drugOrders.forEach(function (drugOrder) {
                    drugOrder.alerts = matchAlertsForDrug(drugOrder.drug);
                });
            });
        }

        if ($scope.drugOrder && $scope.drugOrder.drug) {
            $scope.alerts = matchAlertsForDrug($scope.drugOrder.drug);
        }
    };

    $scope.hasActiveAlerts = function (alerts) {
        return Bahmni.Clinical.CdssAlertUtil.hasActiveAlerts(alerts);
    };

    $scope.closeAlert = function (alert) {
        var alertItem = $rootScope.cdssAlerts.find(function (item) {
            return item.uuid === alert.uuid;
        });

        if (alertItem) {
            alertItem.isActive = false;
        }
    };

    $scope.toggleDetails = function (alert) {
        alert.showDetails = !alert.showDetails;
    };

    $scope.auditOptions = function () {
        return appService
          .getAppDescriptor()
          .getConfigValue('cdssDismissalOptionsToDisplay');
    };

    $scope.auditForm = {};

    $scope.submitAudit = function (alert) {
        var patientUuid = $stateParams.patientUuid;
        var message = alert.summary.replace(/"/g, '');
        var eventType = 'Dismissed: ' + $scope.auditForm.audit;

        $scope.closeAlert(alert);
        return drugService.cdssAudit(patientUuid, eventType, message, 'CDSS');
    };

    var cdssAlertsWatcher = $rootScope.$watch('cdssAlerts', function () {
        if (!$rootScope.cdssAlerts) return;
        getPreviousDrugAlerts();
    }, true);

    $scope.$on('$destroy', cdssAlertsWatcher);
}])
.directive('cdssAlertRow', function () {
    return {
        restrict: 'E',
        controller: 'cdssAlertRowController',
        templateUrl: './consultation/views/cdssAlertRow.html',
        scope: {
            alerts: '=',
            consultation: '=',
            drugOrder: '='
        }
    };
});
