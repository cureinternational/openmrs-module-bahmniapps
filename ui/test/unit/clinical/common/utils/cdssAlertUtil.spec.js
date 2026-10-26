'use strict';

describe('CdssAlertUtil', function () {
    var cdssAlertUtil = Bahmni.Clinical.CdssAlertUtil;

    describe('matchesMedication', function () {
        it('should match an alert when the drug uuid matches a medication code', function () {
            var alert = {
                referenceMedications: [{coding: [{code: 'drug-uuid', display: 'Drug Name'}]}]
            };

            expect(cdssAlertUtil.matchesMedication(alert, {uuid: 'drug-uuid', name: 'Another Name'})).toBe(true);
        });

        it('should match an alert when the drug name matches a medication display', function () {
            var alert = {
                referenceMedications: [{coding: [{code: 'other-uuid', display: 'Drug Name'}]}]
            };

            expect(cdssAlertUtil.matchesMedication(alert, {uuid: 'drug-uuid', name: 'Drug Name'})).toBe(true);
        });

        it('should not match an alert when the drug does not match any medication coding', function () {
            var alert = {
                referenceMedications: [{coding: [{code: 'drug-uuid', display: 'Drug Name'}]}]
            };

            expect(cdssAlertUtil.matchesMedication(alert, {uuid: 'other-uuid', name: 'Other Drug'})).toBe(false);
        });

        it('should not match an alert without reference medications', function () {
            expect(cdssAlertUtil.matchesMedication({}, {uuid: 'drug-uuid'})).toBe(false);
        });

        it('should not match an alert when the drug is missing', function () {
            var alert = {
                referenceMedications: [{coding: [{code: 'drug-uuid', display: 'Drug Name'}]}]
            };

            expect(cdssAlertUtil.matchesMedication(alert, undefined)).toBe(false);
        });

        it('should handle malformed reference medication data safely', function () {
            var alert = {
                referenceMedications: [
                    null,
                    {},
                    {coding: null},
                    {coding: [null, {}, {code: 'drug-uuid', display: 'Drug Name'}]}
                ]
            };

            expect(function () {
                cdssAlertUtil.matchesMedication(alert, {uuid: 'drug-uuid'});
            }).not.toThrow();
            expect(cdssAlertUtil.matchesMedication(alert, {uuid: 'drug-uuid'})).toBe(true);
        });
    });

    describe('hasActiveAlerts', function () {
        it('should return true when any alert is active', function () {
            expect(cdssAlertUtil.hasActiveAlerts([{isActive: false}, {isActive: true}])).toBe(true);
        });

        it('should return false when no alerts are active', function () {
            expect(cdssAlertUtil.hasActiveAlerts([{isActive: false}, {}])).toBe(false);
        });

        it('should return false when alerts are missing', function () {
            expect(cdssAlertUtil.hasActiveAlerts()).toBe(false);
            expect(cdssAlertUtil.hasActiveAlerts(null)).toBe(false);
            expect(cdssAlertUtil.hasActiveAlerts([])).toBe(false);
        });
    });
});
