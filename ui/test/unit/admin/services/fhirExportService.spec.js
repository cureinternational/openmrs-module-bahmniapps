'use strict';

describe('fhirExportService', function () {
    var fhirExportService;
    var mockHttp = jasmine.createSpyObj('$http', ['get', 'post']);

    beforeEach(function () {
        module('bahmni.admin');
        module(function ($provide) {
            $provide.value('$http', mockHttp);
            $provide.value('messagingService', jasmine.createSpyObj('messagingService', ['showMessage']));
            $provide.value('$translate', { instant: function (key) { return key; } });
        });

        inject(['fhirExportService', function (injected) {
            fhirExportService = injected;
        }]);

        mockHttp.get.calls.reset();
        mockHttp.post.calls.reset();
        mockHttp.get.and.returnValue(specUtil.respondWith({}));
        mockHttp.post.and.returnValue(specUtil.respondWith({}));
    });

    it('should call getUuidForAnonymiseConcept with correct params', function () {
        fhirExportService.getUuidForAnonymiseConcept();
        expect(mockHttp.get).toHaveBeenCalledWith(
            Bahmni.Common.Constants.conceptUrl,
            { params: { name: 'FHIR Export Anonymise Flag', s: 'default', v: 'default' } }
        );
    });

    it('should call loadFhirTasks with correct params', function () {
        fhirExportService.loadFhirTasks();
        expect(mockHttp.get).toHaveBeenCalledWith(
            Bahmni.Common.Constants.fhirTasks,
            { params: { "_sort:desc": "_lastUpdated", _count: 50 } }
        );
    });

    it('should call export with startDate and endDate when both are provided', function () {
        fhirExportService.export('user1', '2023-01-01', '2023-12-31', true);
        var url = mockHttp.post.calls.mostRecent().args[0];
        expect(url).toContain('anonymise=true');
        expect(url).toContain('startDate=2023-01-01');
        expect(url).toContain('endDate=2023-12-31');
    });

    it('should call export without startDate and endDate when not provided', function () {
        fhirExportService.export('user1', null, null, false);
        var url = mockHttp.post.calls.mostRecent().args[0];
        expect(url).toContain('anonymise=false');
        expect(url).not.toContain('startDate');
        expect(url).not.toContain('endDate');
    });

    it('should call export with only startDate when endDate is not provided', function () {
        fhirExportService.export('user1', '2023-01-01', null, false);
        var url = mockHttp.post.calls.mostRecent().args[0];
        expect(url).toContain('startDate=2023-01-01');
        expect(url).not.toContain('endDate');
    });

    it('should call submitAudit with correct audit data', function () {
        fhirExportService.submitAudit('testUser', '2023-01-01', '2023-12-31', true);
        expect(mockHttp.post).toHaveBeenCalledWith(
            Bahmni.Common.Constants.auditLogUrl,
            jasmine.objectContaining({
                username: 'testUser',
                eventType: 'PATIENT_DATA_BULK_EXPORT',
                module: 'Export'
            }),
            { withCredentials: true }
        );
    });

    it('should include Anonymized in audit message when anonymise is true', function () {
        fhirExportService.submitAudit('testUser', '2023-01-01', '2023-12-31', true);
        var auditData = mockHttp.post.calls.mostRecent().args[1];
        expect(auditData.message).toContain('Anonymized');
    });

    it('should include Non-Anonymized in audit message when anonymise is false', function () {
        fhirExportService.submitAudit('testUser', '2023-01-01', '2023-12-31', false);
        var auditData = mockHttp.post.calls.mostRecent().args[1];
        expect(auditData.message).toContain('Non-Anonymized');
    });

    it('should include username in audit message', function () {
        fhirExportService.submitAudit('john', '2023-01-01', '2023-12-31', false);
        var auditData = mockHttp.post.calls.mostRecent().args[1];
        expect(auditData.message).toContain('john');
    });
});
