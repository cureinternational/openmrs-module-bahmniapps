describe('alertOnExit Directive', function () {
    var $rootScope, $compile, $scope, exitAlertService, $state;

    beforeEach(function () {
        module('bahmni.clinical');

        exitAlertService = {
            setIsNavigating: jasmine.createSpy('setIsNavigating').and.returnValue(true),
            setDirtyConsultationForm: jasmine.createSpy('setDirtyConsultationForm').and.returnValue(true),
            showExitAlert: jasmine.createSpy('showExitAlert')
        };

        module(function ($provide) {
            $provide.value('exitAlertService', exitAlertService);
            $provide.value('$state', {
                params: { patientUuid: 'currentPatientUuid' },
                dirtyConsultationForm: true
            });
        });

        inject(function (_$rootScope_, _$compile_, _$state_) {
            $rootScope = _$rootScope_;
            $compile = _$compile_;
            $state = _$state_;
            $scope = $rootScope.$new();
        });
    });

    it('should call exitAlertService methods with correct arguments on $stateChangeStart', function () {
        var element = angular.element('<div alert-on-exit></div>');
        $compile(element)($scope);
        $scope.$digest();

        var next = { url: '/patient/search', spinnerToken: 'spinner' };
        var current = { patientUuid: 'previousPatientUuid' };
        var event = $rootScope.$broadcast('$stateChangeStart', next, current);

        expect(exitAlertService.setIsNavigating).toHaveBeenCalledWith(next, 'currentPatientUuid', 'previousPatientUuid');
        expect(exitAlertService.showExitAlert).toHaveBeenCalledWith(true, true, event, 'spinner');
    });

    it('should not show popup after main save when navigating away', function () {
        exitAlertService.setIsNavigating.and.returnValue(false);
        var element = angular.element('<div alert-on-exit></div>');
        $compile(element)($scope);
        $scope.$digest();

        $state.justSaved = true;
        $state.dirtyConsultationForm = true;

        var next = { url: '/other/page', spinnerToken: 'spinner' };
        var current = { patientUuid: 'currentPatientUuid' };
        var event = $rootScope.$broadcast('$stateChangeStart', next, current);

        expect($state.dirtyConsultationForm).toBe(false);
    });

    it('should reset justSaved flag when navigating to a different patient after save', function () {
        var element = angular.element('<div alert-on-exit></div>');
        $compile(element)($scope);
        $scope.$digest();

        $state.justSaved = true;
        $state.dirtyConsultationForm = true;

        var next = { url: '/patient/123/page', spinnerToken: 'spinner' };
        var current = { patientUuid: 'differentPatientUuid' };
        $state.params.patientUuid = 'currentPatientUuid';

        var event = $rootScope.$broadcast('$stateChangeStart', next, current);

        expect($state.justSaved).toBe(false);
    });
});
