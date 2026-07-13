'use strict';

describe('patientPhotoPreview directive', function () {
    var scope, $compile, element, ngDialogSpy;

    beforeEach(module('bahmni.common.patient'));

    beforeEach(module(function ($provide) {
        ngDialogSpy = jasmine.createSpyObj('ngDialog', ['open']);
        $provide.value('ngDialog', ngDialogSpy);
    }));

    beforeEach(inject(function (_$compile_, $rootScope) {
        scope    = $rootScope.$new();
        $compile = _$compile_;

        // Remove stale init markers left by previous tests
        var stale = document.querySelectorAll('#patient-photo-preview-init');
        Array.prototype.forEach.call(stale, function (el) { el.parentNode && el.parentNode.removeChild(el); });
        var staleStyle = document.getElementById('patient-photo-preview-styles');
        if (staleStyle) { staleStyle.parentNode.removeChild(staleStyle); }
    }));

    afterEach(function () {
        if (element) { element.remove(); }
        // Destroying scope triggers the registered cleanup (removes listener + marker)
        scope.$destroy();
    });

    function compileElement (src) {
        var html = '<img class="patient-image" />';
        element  = $compile(angular.element(html))(scope);
        if (src) { element[0].setAttribute('src', src); }
        angular.element(document.body).append(element);
        scope.$digest();
        return element;
    }

    function clickNative (node) {
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    it('should inject styles into document head', function () {
        compileElement('patient.jpg');
        expect(document.getElementById('patient-photo-preview-styles')).not.toBeNull();
    });

    it('should open ngDialog when a real photo is clicked', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);
        expect(ngDialogSpy.open).toHaveBeenCalledWith(jasmine.objectContaining({
            data: { src: 'patient.jpg' },
            className: 'ngdialog-theme-default patient-photo-dialog'
        }));
    });

    it('should not open ngDialog when src is empty', function () {
        var img = compileElement('');
        clickNative(img[0]);
        expect(ngDialogSpy.open).not.toHaveBeenCalled();
    });

    it('should not open ngDialog for the IPD React micro-frontend patient photo (data-testid="patient-photo")', function () {
        var img = compileElement('patient.jpg');
        img[0].setAttribute('data-testid', 'patient-photo');
        clickNative(img[0]);
        expect(ngDialogSpy.open).not.toHaveBeenCalled();
    });

    it('should not create duplicate listeners when multiple patient-image elements exist', function () {
        compileElement('patient1.jpg');
        var second = $compile(angular.element('<img class="patient-image" />'))(scope);
        second[0].setAttribute('src', 'patient2.jpg');
        angular.element(document.body).append(second);
        scope.$digest();

        clickNative(second[0]);
        expect(ngDialogSpy.open.calls.count()).toBe(1);
        second.remove();
    });

    it('should keep the click listener working for remaining images when one of several patient-image elements is destroyed', function () {
        var firstScope = scope.$new();
        var secondScope = scope.$new();

        var first = $compile(angular.element('<img class="patient-image" />'))(firstScope);
        first.attr('src', 'patient1.jpg');
        angular.element(document.body).append(first);

        var second = $compile(angular.element('<img class="patient-image" />'))(secondScope);
        second.attr('src', 'patient2.jpg');
        angular.element(document.body).append(second);

        firstScope.$digest();
        secondScope.$digest();

        // Destroy only the first instance's scope - the listener should stay alive
        // because the second patient-image element is still present on the page.
        firstScope.$destroy();
        first.remove();

        expect(document.getElementById('patient-photo-preview-init')).not.toBeNull();

        clickNative(second[0]);
        expect(ngDialogSpy.open).toHaveBeenCalledWith(jasmine.objectContaining({
            data: { src: 'patient2.jpg' }
        }));

        // Destroying the last remaining instance should tear down the shared listener.
        secondScope.$destroy();
        second.remove();
        expect(document.getElementById('patient-photo-preview-init')).toBeNull();
    });

    it('should use closeByDocument and closeByEscape in ngDialog options', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);
        expect(ngDialogSpy.open).toHaveBeenCalledWith(jasmine.objectContaining({
            closeByDocument: true,
            closeByEscape: true,
            showClose: false
        }));
    });

    it('should include ARIA attributes in the modal template', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);
        var template = ngDialogSpy.open.calls.mostRecent().args[0].template;
        expect(template).toContain('role="dialog"');
        expect(template).toContain('aria-modal="true"');
        expect(template).toContain('aria-label="Enlarged patient photo"');
    });

    it('should remove click listener and init marker when scope is destroyed', function () {
        compileElement('patient.jpg');
        expect(document.getElementById('patient-photo-preview-init')).not.toBeNull();

        scope.$destroy();

        expect(document.getElementById('patient-photo-preview-init')).toBeNull();

        // Clicks should no longer open the dialog after cleanup
        ngDialogSpy.open.calls.reset();
        var orphan = document.createElement('img');
        orphan.className = 'patient-image';
        orphan.setAttribute('src', 'orphan.jpg');
        document.body.appendChild(orphan);
        clickNative(orphan);
        expect(ngDialogSpy.open).not.toHaveBeenCalled();
        document.body.removeChild(orphan);
    });
});
