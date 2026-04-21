'use strict';

describe('Filter: reverse', function () {
    var reverseFilter;

    beforeEach(module('bahmni.common.uiHelper'));
    beforeEach(inject(function ($filter) {
        reverseFilter = $filter('reverse');
    }));

    it('should return items in reverse order', function () {
        expect(reverseFilter([1, 2, 3])).toEqual([3, 2, 1]);
    });

    it('should return null/undefined when items is falsy', function () {
        expect(reverseFilter(null)).toBeFalsy();
        expect(reverseFilter(undefined)).toBeFalsy();
    });

    it('should not mutate the original array', function () {
        var original = [1, 2, 3];
        reverseFilter(original);
        expect(original).toEqual([1, 2, 3]);
    });
});
