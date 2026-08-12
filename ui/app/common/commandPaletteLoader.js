'use strict';

(function () {
    var LOADER_RETRY_DELAY = 250;
    var LOADER_MAX_RETRIES = 40;
    var SCRIPT_ID = 'bahmni-command-palette-script';

    var appendScript = function () {
        if (document.getElementById(SCRIPT_ID)) {
            return;
        }

        var hostUrl = localStorage.getItem('host') ? ('https://' + localStorage.getItem('host')) : '';
        var script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = hostUrl + '/bahmni-new/command-palette.js';
        document.body.appendChild(script);
    };
    var loadWhenAuthenticated = function (retryCount) {
        fetch('/openmrs/ws/rest/v1/session', {
            credentials: 'same-origin'
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (session) {
                if (session.authenticated) {
                    appendScript();
                    return;
                }

                if (retryCount < LOADER_MAX_RETRIES) {
                    // eslint-disable-next-line angular/timeout-service
                    window.setTimeout(function () {
                        loadWhenAuthenticated(retryCount + 1);
                    }, LOADER_RETRY_DELAY);
                }
            });
    };

    window.Bahmni = window.Bahmni || {};
    window.Bahmni.Common = window.Bahmni.Common || {};
    window.Bahmni.Common.commandPaletteLoader = {
        load: function () {
            if (localStorage.getItem('enableCommandPalette') === 'true') {
                loadWhenAuthenticated(0);
            }
        }
    };

    window.Bahmni.Common.commandPaletteLoader.load();
}());
