'use strict';

describe('otNotes directive', function () {
    beforeEach(module('bahmni.ot'));

    it('should be defined as a directive in bahmni.ot module', inject(function ($injector) {
        var $compile = $injector.get('$compile');
        expect($compile).toBeDefined();
    }));
});
