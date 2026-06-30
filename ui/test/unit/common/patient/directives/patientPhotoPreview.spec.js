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

        // Remove ALL init markers accumulated by other spec files
        var stale = document.querySelectorAll('#patient-photo-preview-init');
        Array.prototype.forEach.call(stale, function (el) { el.parentNode && el.parentNode.removeChild(el); });
        var staleStyle = document.getElementById('patient-photo-preview-styles');
        if (staleStyle) { staleStyle.parentNode.removeChild(staleStyle); }
    }));

    afterEach(function () {
        if (element) { element.remove(); }
        var stale = document.querySelectorAll('#patient-photo-preview-init');
        Array.prototype.forEach.call(stale, function (el) { el.parentNode && el.parentNode.removeChild(el); });
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

    it('should not open ngDialog when blank-user placeholder is clicked', function () {
        var img = compileElement('../images/blank-user.gif');
        clickNative(img[0]);
        expect(ngDialogSpy.open).not.toHaveBeenCalled();
    });

    it('should not open ngDialog when src is empty', function () {
        var img = compileElement('');
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

    it('should use closeByDocument and closeByEscape in ngDialog options', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);
        expect(ngDialogSpy.open).toHaveBeenCalledWith(jasmine.objectContaining({
            closeByDocument: true,
            closeByEscape: true,
            showClose: false
        }));
    });
});
