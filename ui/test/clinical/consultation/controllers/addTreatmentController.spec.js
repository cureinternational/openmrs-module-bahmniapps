describe('AddTreatmentController', function () {
    var $controller, $rootScope, $scope, $q, messagingService, observationsService, diagnosisService, $translate;

    beforeEach(module('bahmni.clinical'));

    beforeEach(inject(function (_$controller_, _$rootScope_, _$q_, _messagingService_, _observationsService_, _diagnosisService_, _$translate_) {
        $controller = _$controller_;
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $q = _$q_;
        messagingService = _messagingService_;
        observationsService = _observationsService_;
        diagnosisService = _diagnosisService_;
        $translate = _$translate_;

        spyOn(messagingService, 'showMessage');
        spyOn(observationsService, 'fetch').and.returnValue($q.resolve({ data: [] }));
        spyOn(diagnosisService, 'getPatientDiagnosis').and.returnValue($q.resolve({ data: [] }));

        $controller('AddTreatmentController', {
            $scope: $scope,
            $q: $q,
            messagingService: messagingService,
            observationsService: observationsService,
            diagnosisService: diagnosisService,
            $translate: $translate
        });
    }));

    it('should initialize with default values', function () {
        expect($scope.showOrderSetDetails).toBe(true);
        expect($scope.addTreatment).toBe(true);
        expect($scope.canOrderSetBeAdded).toBe(true);
    });

    it('should fetch filtered order sets when search term is valid', function () {
        $scope.getFilteredOrderSets('test');
        expect(mockDependencies.orderSetService.getOrderSetsByQuery).toHaveBeenCalledWith('test');
    });

    it('should not fetch order sets for invalid search term', function () {
        $scope.getFilteredOrderSets('te');
        expect($scope.orderSets).toEqual({});
    });

    it('should handle context change correctly', function () {
        var result = $scope.incompleteDrugOrders();
        expect(result).toBe(false); // Adjust based on actual logic
    });

    it('should show combined error message when both patient weight and diagnosis are invalid', function () {
        $scope.addTreatmentWithPatientWeight = { duration: 3600 };
        $scope.addTreatmentWithDiagnosis = { order: 'primary' };

        observationsService.fetch.and.returnValue($q.resolve({ data: [] }));
        diagnosisService.getPatientDiagnosis.and.returnValue($q.resolve({ data: [] }));

        $scope.init();
        $rootScope.$apply();

        expect(messagingService.showMessage).toHaveBeenCalledWith('error', $translate.instant('PATIENT_WEIGHT_AND_DIAGNOSIS_ERROR'));
    });

    it('should show patient weight error message when only patient weight is invalid', function () {
        $scope.addTreatmentWithPatientWeight = { duration: 3600 };
        $scope.addTreatmentWithDiagnosis = { order: 'primary' };

        observationsService.fetch.and.returnValue($q.resolve({ data: [] }));
        diagnosisService.getPatientDiagnosis.and.returnValue($q.resolve({ data: [{ order: 'primary' }] }));

        $scope.init();
        $rootScope.$apply();

        expect(messagingService.showMessage).toHaveBeenCalledWith('error', $translate.instant('ENTER_PATIENT_WEIGHT_ERROR'));
    });

    it('should show diagnosis error message when only diagnosis is invalid', function () {
        $scope.addTreatmentWithPatientWeight = { duration: 3600 };
        $scope.addTreatmentWithDiagnosis = { order: 'primary' };

        observationsService.fetch.and.returnValue($q.resolve({ data: [{ observationDateTime: new Date().getTime() }] }));
        diagnosisService.getPatientDiagnosis.and.returnValue($q.resolve({ data: [] }));

        $scope.init();
        $rootScope.$apply();

        expect(messagingService.showMessage).toHaveBeenCalledWith('error', $translate.instant('ENTER_DIAGNOSIS_ERROR'));
    });

    it('should not show any error message when both patient weight and diagnosis are valid', function () {
        $scope.addTreatmentWithPatientWeight = { duration: 3600 };
        $scope.addTreatmentWithDiagnosis = { order: 'primary' };

        observationsService.fetch.and.returnValue($q.resolve({ data: [{ observationDateTime: new Date().getTime() }] }));
        diagnosisService.getPatientDiagnosis.and.returnValue($q.resolve({ data: [{ order: 'primary' }] }));

        $scope.init();
        $rootScope.$apply();

        expect(messagingService.showMessage).not.toHaveBeenCalled();
    });

    // Add more tests to cover all branches...
});
