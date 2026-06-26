'use strict';

describe('patientPhotoPreview directive', function () {
    var scope, $compile, element;

    beforeEach(module('bahmni.common.patient'));

    beforeEach(inject(function (_$compile_, $rootScope) {
        scope = $rootScope.$new();
        $compile = _$compile_;
        // Remove any overlays accumulated by other tests that compile patient-image elements
        var stale = document.querySelectorAll('.patient-photo-modal-overlay');
        Array.prototype.forEach.call(stale, function (el) { el.parentNode && el.parentNode.removeChild(el); });
    }));

    afterEach(function () {
        if (element) { element.remove(); }
        var overlays = document.querySelectorAll('.patient-photo-modal-overlay');
        Array.prototype.forEach.call(overlays, function (el) { el.parentNode && el.parentNode.removeChild(el); });
    });

    function compileElement (src) {
        var html = '<img class="patient-image" />';
        element = $compile(angular.element(html))(scope);
        if (src) { element.attr('src', src); }
        angular.element(document.body).append(element);
        scope.$digest();
        return element;
    }

    function getOverlay () {
        return document.querySelector('.patient-photo-modal-overlay');
    }

    it('should append a modal overlay to the document body', function () {
        compileElement('patient.jpg');
        expect(document.querySelectorAll('.patient-photo-modal-overlay').length).toBe(1);
    });

    it('should open the modal and set image src when a real photo is clicked', function () {
        var img = compileElement('patient.jpg');

        img.triggerHandler('click');

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);
        expect(overlay.querySelector('.patient-photo-modal-image').getAttribute('src')).toBe('patient.jpg');
    });

    it('should not open the modal when clicked and src is blank-user placeholder', function () {
        var img = compileElement('../images/blank-user.gif');
        img.triggerHandler('click');

        expect(getOverlay().classList.contains('is-open')).toBe(false);
    });

    it('should not open the modal when clicked and src is empty', function () {
        var img = compileElement('');
        img.triggerHandler('click');

        expect(getOverlay().classList.contains('is-open')).toBe(false);
    });

    it('should close the modal when backdrop is clicked', function () {
        var img = compileElement('patient.jpg');
        img.triggerHandler('click');

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);

        angular.element(overlay.querySelector('.patient-photo-modal-backdrop')).triggerHandler('click');
        expect(overlay.classList.contains('is-open')).toBe(false);
    });

    it('should close the modal when the close button is clicked', function () {
        var img = compileElement('patient.jpg');
        img.triggerHandler('click');

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);

        angular.element(overlay.querySelector('.patient-photo-modal-close')).triggerHandler('click');
        expect(overlay.classList.contains('is-open')).toBe(false);
    });

    it('should close the modal when Esc key is pressed', function () {
        var img = compileElement('patient.jpg');
        img.triggerHandler('click');

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);

        angular.element(document).triggerHandler({ type: 'keydown', keyCode: 27 });
        expect(overlay.classList.contains('is-open')).toBe(false);
    });

    it('should remove the overlay from the DOM on scope destroy', function () {
        compileElement('patient.jpg');
        expect(document.querySelectorAll('.patient-photo-modal-overlay').length).toBe(1);

        scope.$destroy();

        expect(document.querySelectorAll('.patient-photo-modal-overlay').length).toBe(0);
    });
});
