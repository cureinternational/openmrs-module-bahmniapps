'use strict';

describe('onHorizontalScroll directive', function () {
    var $compile, scope;

    beforeEach(module('bahmni.ot'));

    beforeEach(inject(function (_$compile_, $rootScope) {
        $compile = _$compile_;
        scope = $rootScope.$new();
    }));

    it('should sync scrollLeft of target element with source element on scroll', function () {
        var targetDiv = document.createElement('div');
        targetDiv.className = 'ot-scroll-target';
        document.body.appendChild(targetDiv);

        var element = angular.element('<div on-horizontal-scroll="ot-scroll-target"></div>');
        document.body.appendChild(element[0]);
        $compile(element)(scope);
        scope.$digest();

        element.triggerHandler('scroll');

        expect(targetDiv.scrollLeft).toBe(element[0].scrollLeft);

        document.body.removeChild(targetDiv);
        document.body.removeChild(element[0]);
    });
});
