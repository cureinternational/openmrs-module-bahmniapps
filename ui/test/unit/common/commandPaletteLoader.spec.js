'use strict';

describe('commandPaletteLoader', function () {
    var originalSetTimeout;
    var originalScriptId;

    beforeEach(function () {
        localStorage.clear();
        originalSetTimeout = window.setTimeout;
        originalScriptId = 'bahmni-command-palette-script';

        var existingScript = document.getElementById(originalScriptId);
        if (existingScript && existingScript.parentNode) {
            existingScript.parentNode.removeChild(existingScript);
        }
    });

    afterEach(function () {
        window.setTimeout = originalSetTimeout;
        localStorage.clear();
    });

    it('should append the command palette script when enabled', function () {
        localStorage.setItem('enableCommandPalette', 'true');
        localStorage.setItem('host', 'example.org');

        spyOn(document.body, 'appendChild').and.callThrough();

        Bahmni.Common.commandPaletteLoader.load();

        expect(document.body.appendChild).toHaveBeenCalled();
        expect(document.getElementById(originalScriptId)).toBeTruthy();
        expect(document.getElementById(originalScriptId).src).toContain('https://example.org/bahmni-new/command-palette.js');
    });

    it('should not append the script when disabled', function () {
        localStorage.setItem('enableCommandPalette', 'false');

        spyOn(document.body, 'appendChild').and.callThrough();

        Bahmni.Common.commandPaletteLoader.load();

        expect(document.body.appendChild).not.toHaveBeenCalled();
        expect(document.getElementById(originalScriptId)).toBeFalsy();
    });
});