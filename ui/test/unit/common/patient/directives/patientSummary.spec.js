'use strict';

describe('patientSummary', function () {
    var compile, scope, $translate, DateUtil;

    beforeEach(module('bahmni.common.patient'));
    beforeEach(module(function ($provide) {
        $translate = jasmine.createSpyObj('$translate', ['instant']);
        $translate.instant.and.callFake(function (key) {
            if (key === 'CLINICAL_YEARS_TRANSLATION_KEY') return 'years';
            if (key === 'CLINICAL_MONTHS_TRANSLATION_KEY') return 'months';
            if (key === 'CLINICAL_DAYS_TRANSLATION_KEY') return 'days';
            return key;
        });
        $provide.value('$translate', $translate);
    }));

    beforeEach(inject(function ($compile, $rootScope) {
        compile = $compile;
        scope = $rootScope.$new();
        DateUtil = Bahmni.Common.Util.DateUtil;
    }));

    function createDirective() {
        var element = angular.element('<patient-summary patient="patient"></patient-summary>');
        var compiledElement = compile(element)(scope);
        scope.$digest();
        return compiledElement;
    }

    describe('calculateAge', function () {
        beforeEach(function () {
            spyOn(DateUtil, 'now').and.returnValue(new Date('2025-03-10'));
        });

        it('should return empty string when birthDate is not provided', function () {
            scope.patient = { birthdate: null };
            createDirective();
            expect(scope.displayAge).toBeUndefined();
        });

        it('should calculate age with only years', function () {
            scope.patient = { birthdate: new Date('2020-01-01') };
            createDirective();
            expect(scope.displayAge).toBe('5 <span> years </span>');
        });

        it('should calculate age with years and months', function () {
            scope.patient = { birthdate: new Date('2020-01-10') };
            createDirective();
            expect(scope.displayAge).toBe('5 <span> years </span> 2 <span> months </span>');
        });

        it('should calculate age with years, months and days', function () {
            scope.patient = { birthdate: new Date('2020-02-15') };
            createDirective();
            expect(scope.displayAge).toBe('5 <span> years </span> 0 <span> months </span> 23 <span> days </span>');
        });

        it('should calculate age with only months and days for infants', function () {
            scope.patient = { birthdate: new Date('2024-09-15') };
            createDirective();
            expect(scope.displayAge).toBe('5 <span> months </span> 25 <span> days </span>');
        });

        it('should calculate age with only days for newborns', function () {
            scope.patient = { birthdate: new Date('2025-03-01') };
            createDirective();
            expect(scope.displayAge).toBe('9 <span> days </span>');
        });

        it('should update age when patient data changes', function () {
            scope.patient = { birthdate: new Date('2020-01-01') };
            createDirective();
            expect(scope.displayAge).toBe('5 <span> years </span>');

            scope.patient = { birthdate: new Date('2024-01-01') };
            scope.$digest();
            expect(scope.displayAge).toBe('1 <span> years </span> 2 <span> months </span>');
        });
    });

    describe('patient details toggle', function () {
        it('should toggle patient details', function () {
            scope.patient = {};
            createDirective();
            expect(scope.showPatientDetails).toBeFalsy();
            
            scope.togglePatientDetails();
            expect(scope.showPatientDetails).toBeTruthy();
            
            scope.togglePatientDetails();
            expect(scope.showPatientDetails).toBeFalsy();
        });
    });

    describe('image click handler', function () {
        it('should call onImageClickHandler when provided', function () {
            scope.patient = {};
            scope.onImageClickHandler = jasmine.createSpy('onImageClickHandler');
            createDirective();
            
            scope.onImageClick();
            expect(scope.onImageClickHandler).toHaveBeenCalled();
        });

        it('should not throw error when onImageClickHandler is not provided', function () {
            scope.patient = {};
            createDirective();
            
            expect(function () {
                scope.onImageClick();
            }).not.toThrow();
        });
    });
});
