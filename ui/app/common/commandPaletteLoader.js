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

    var loadWhenEnabled = function (retryCount) {
        var paletteSetting = localStorage.getItem('enableCommandPalette');

        if (paletteSetting === 'true') {
            appendScript();
            return;
        }

        if (paletteSetting === 'false' || retryCount >= LOADER_MAX_RETRIES) {
            return;
        }

        window.setTimeout(function () {
            loadWhenEnabled(retryCount + 1);
        }, LOADER_RETRY_DELAY);
    };

    window.Bahmni = window.Bahmni || {};
    window.Bahmni.Common = window.Bahmni.Common || {};
    window.Bahmni.Common.commandPaletteLoader = {
        load: function () {
            loadWhenEnabled(0);
        }
    };

    window.Bahmni.Common.commandPaletteLoader.load();
}());
