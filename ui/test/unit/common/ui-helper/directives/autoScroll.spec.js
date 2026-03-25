'use strict';

describe('autoScroll', function () {
    var element, scope, compile, $timeout;

    beforeEach(module('bahmni.common.uiHelper'));

    beforeEach(inject(function ($rootScope, $compile, _$timeout_) {
        scope = $rootScope.$new();
        compile = $compile;
        $timeout = _$timeout_;
        spyOn($.fn, 'animate');
        spyOn($.fn, 'offset').and.returnValue({ top: 100 });
    }));

    it('should call animate when autoScrollEnabled is true', function () {
        scope.enabled = true;
        element = angular.element('<div auto-scroll auto-scroll-enabled="enabled"></div>');
        compile(element)(scope);
        scope.$digest();
        $timeout.flush();

        expect($.fn.animate).toHaveBeenCalled();
    });

    it('should not call animate when autoScrollEnabled is false', function () {
        scope.enabled = false;
        element = angular.element('<div auto-scroll auto-scroll-enabled="enabled"></div>');
        compile(element)(scope);
        scope.$digest();
        $timeout.flush();

        expect($.fn.animate).not.toHaveBeenCalled();
    });
});
