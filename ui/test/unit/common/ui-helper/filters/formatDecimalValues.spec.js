'use strict';

describe('Filter: formatDecimalValues', function () {
    var formatDecimalValuesFilter;

    beforeEach(module('bahmni.common.uiHelper'));
    beforeEach(inject(function ($filter) {
        formatDecimalValuesFilter = $filter('formatDecimalValues');
    }));

    it('should return null when value is falsy', function () {
        expect(formatDecimalValuesFilter(null)).toBeNull();
        expect(formatDecimalValuesFilter(undefined)).toBeNull();
        expect(formatDecimalValuesFilter('')).toBeNull();
    });

    it('should strip trailing .0 followed by whitespace', function () {
        expect(formatDecimalValuesFilter('5.0 mg')).toEqual('5 mg');
    });

    it('should return value unchanged when no .0 followed by whitespace', function () {
        expect(formatDecimalValuesFilter('5.5 mg')).toEqual('5.5 mg');
        expect(formatDecimalValuesFilter('5.0')).toEqual('5.0');
    });
});
