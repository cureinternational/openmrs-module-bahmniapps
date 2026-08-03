"use strict";

angular.module('bahmni.adt')
.controller('CareViewController', ['$rootScope', '$scope', '$state', '$window', 'auditLogService', 'logoutService', function ($rootScope, $scope, $state, $window, auditLogService, logoutService) {
    function handleLogoutShortcut (event) {
        if ((event.metaKey || event.ctrlKey) && event.key === $rootScope.quickLogoutComboKey) {
            $scope.hostApi.onLogOut();
        }
    }
    function cleanup () {
        $window.removeEventListener('keydown', handleLogoutShortcut);
    }
    $window.addEventListener('keydown', handleLogoutShortcut);
    $scope.$on('$destroy', cleanup);
    $scope.hostData = {
        currentUser: $rootScope.currentUser,
        provider: $rootScope.currentProvider
    };
    $scope.hostApi = {
        onHome: function () {
            $state.go('home');
        },
        onLogOut: function () {
            logoutService.attemptLogout($scope);
        },
        handleAuditEvent: function (patientUuid, eventType, messageParams, module) {
            return auditLogService.log(patientUuid, eventType, messageParams, module);
        }
    };
}]);
