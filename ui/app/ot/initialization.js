'use strict';

angular.module('bahmni.ot').factory('initialization', ['$rootScope', '$q', 'surgicalAppointmentHelper', 'appService', 'surgicalAppointmentService', 'authenticator', 'spinner',
    function ($rootScope, $q, surgicalAppointmentHelper, appService, surgicalAppointmentService, authenticator, spinner) {
        var initApp = function () {
            return appService.initApp('ot', {'app': true, 'extension': true}).then(function (data) {
                var providerNames = data.getConfigValue("primarySurgeonsForOT");
                return $q.all([surgicalAppointmentService.getSurgeons(), surgicalAppointmentService.getSurgicalAppointmentAttributeTypes()]).then(function (response) {
                    $rootScope.surgeons = surgicalAppointmentHelper.filterProvidersByName(providerNames, response[0].data.results);
                    $rootScope.attributeTypes = response[1].data.results;
                    return response;
                });
            });
        };
        return spinner.forPromise(authenticator.authenticateUser().then(initApp));
    }
]).factory('otUtils', ['$rootScope', function ($rootScope) {
    return {
        getConceptFormatAttributeName: function () {
            if (!$rootScope.attributeTypes) {
                return null;
            }
            var conceptFormatAttribute = _.find($rootScope.attributeTypes, function (attr) {
                return attr.format === 'org.openmrs.Concept';
            });
            return conceptFormatAttribute ? conceptFormatAttribute.name : null;
        },
        getConceptFormatAttributeNames: function () {
            if (!$rootScope.attributeTypes) {
                return [];
            }
            return _.map(
                _.filter($rootScope.attributeTypes, function (attr) {
                    return attr.format === 'org.openmrs.Concept';
                }),
                'name'
            );
        }
    };
}]);
