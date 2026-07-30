'use strict';

describe('commandPaletteLoader', function () {
    var loaderPath = '/base/app/common/commandPaletteLoader.js';

    function removeInjectedScripts() {
        Array.prototype.slice.call(document.querySelectorAll('script')).forEach(function (node) {
            if (node.src && node.src.indexOf('/bahmni-new/command-palette.js') !== -1 && node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
    }

    function executeLoaderScript() {
        var request = new XMLHttpRequest();
        request.open('GET', loaderPath, false);
        request.send(null);
        expect(request.status === 200 || request.status === 0).toBeTruthy();

        (0, eval)(request.responseText);
    }

    beforeEach(function () {
        localStorage.clear();
        removeInjectedScripts();
    });

    afterEach(function () {
        removeInjectedScripts();
        localStorage.clear();
    });

    it('should append the command palette script when enabled', function () {
        localStorage.setItem('enableCommandPalette', 'true');
        localStorage.setItem('host', 'example.org');

        spyOn(document.body, 'appendChild').and.callThrough();

        executeLoaderScript();

        expect(document.body.appendChild).toHaveBeenCalled();

        var appendedScript = document.body.appendChild.calls.mostRecent().args[0];
        expect(appendedScript.tagName).toBe('SCRIPT');
        expect(appendedScript.src).toContain('https://example.org/bahmni-new/command-palette.js');
    });

    it('should not append the script when disabled', function () {
        localStorage.setItem('enableCommandPalette', 'false');

        spyOn(document.body, 'appendChild').and.callThrough();

        executeLoaderScript();

        expect(document.body.appendChild).not.toHaveBeenCalled();
    });

    it('should append relative script path when host is not set', function () {
        localStorage.setItem('enableCommandPalette', 'true');
        localStorage.removeItem('host');

        spyOn(document.body, 'appendChild').and.callThrough();

        executeLoaderScript();

        var appendedScript = document.body.appendChild.calls.mostRecent().args[0];
        expect(appendedScript.src).toContain('/bahmni-new/command-palette.js');
    });
});
