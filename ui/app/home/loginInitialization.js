'use strict';

angular.module('bahmni.home')
    .factory('loginInitialization', ['$rootScope', '$q', 'locationService', 'spinner', 'messagingService', 'loadConfigService',
        function ($rootScope, $q, locationService, spinner, messagingService, loadConfigService) {
            var init = function () {
                var deferrable = $q.defer();
                locationService.getAllByTag("Login Location").then(
                    function (response) {
                        deferrable.resolve({locations: response.data.results});
                    },
                    function (response) {
                        deferrable.reject();
                        if (response.status) {
                        // This block checks if status code is 401 and reloads the page instead of throwing a pop up error message
                        // Refer BAH-2407 Clinical Module homepage is throwing error on Login Page issue.
                            if (response.status == 401) {
                                location.reload();
                            } else {
                                response = 'MESSAGE_START_OPENMRS';
                                messagingService.showMessage('error', response);
                            }
                        }
                    }
                );

                loadConfigService.loadConfig(Bahmni.Common.Constants.baseUrl + "home/app.json").then(
                    function (response) {
                        var config = response.data && response.data.config;
                        localStorage.setItem('enableCommandPalette', config && config.enableCommandPalette === true ? 'true' : 'false');
                        if (window.Bahmni &&
                            window.Bahmni.Common &&
                            window.Bahmni.Common.commandPaletteLoader) {
                            window.Bahmni.Common.commandPaletteLoader.load();
                        }
                    },
                    function () {
                        localStorage.setItem('enableCommandPalette', 'false');
                    }
                );

                return deferrable.promise;
            };

            return function () {
                return spinner.forPromise(init());
            };
        }
    ]);
