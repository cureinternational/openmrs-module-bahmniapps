'use strict';

describe('patientPhotoPreview directive', function () {
    var scope, $compile, element;

    beforeEach(module('bahmni.common.patient'));

    beforeEach(inject(function (_$compile_, $rootScope) {
        scope    = $rootScope.$new();
        $compile = _$compile_;

        // Remove ALL modals accumulated by other spec files, so each test gets a fresh init
        var stale = document.querySelectorAll('#patient-photo-modal-overlay');
        Array.prototype.forEach.call(stale, function (el) { el.parentNode && el.parentNode.removeChild(el); });
        var staleStyle = document.getElementById('patient-photo-modal-style');
        if (staleStyle) { staleStyle.parentNode.removeChild(staleStyle); }
    }));

    afterEach(function () {
        if (element) { element.remove(); }
        var stale = document.querySelectorAll('#patient-photo-modal-overlay');
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

    function getOverlay () {
        return document.getElementById('patient-photo-modal-overlay');
    }

    it('should append the shared modal overlay to the document body', function () {
        compileElement('patient.jpg');
        expect(document.querySelectorAll('#patient-photo-modal-overlay').length).toBe(1);
    });

    it('should open the modal and set image src when a real photo is clicked', function () {
        var img = compileElement('patient.jpg');

        clickNative(img[0]);

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);
        expect(overlay.querySelector('.patient-photo-modal-image').getAttribute('src')).toBe('patient.jpg');
    });

    it('should not open the modal when blank-user placeholder is clicked', function () {
        var img = compileElement('../images/blank-user.gif');
        clickNative(img[0]);
        expect(getOverlay().classList.contains('is-open')).toBe(false);
    });

    it('should not open the modal when src is empty', function () {
        var img = compileElement('');
        clickNative(img[0]);
        expect(getOverlay().classList.contains('is-open')).toBe(false);
    });

    it('should close the modal when backdrop is clicked', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);

        clickNative(overlay.querySelector('.patient-photo-modal-backdrop'));
        expect(overlay.classList.contains('is-open')).toBe(false);
    });

    it('should close the modal when the close button is clicked', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);

        clickNative(overlay.querySelector('.patient-photo-modal-close'));
        expect(overlay.classList.contains('is-open')).toBe(false);
    });

    it('should close the modal when Esc key is pressed', function () {
        var img = compileElement('patient.jpg');
        clickNative(img[0]);

        var overlay = getOverlay();
        expect(overlay.classList.contains('is-open')).toBe(true);

        document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 27, bubbles: true }));
        expect(overlay.classList.contains('is-open')).toBe(false);
    });

    it('should not create duplicate modals when multiple patient-image elements exist', function () {
        compileElement('patient1.jpg');
        var secondEl = $compile(angular.element('<img class="patient-image" />'))(scope);
        secondEl[0].setAttribute('src', 'patient2.jpg');
        angular.element(document.body).append(secondEl);
        scope.$digest();
        secondEl.remove();

        expect(document.querySelectorAll('#patient-photo-modal-overlay').length).toBe(1);
    });
});
