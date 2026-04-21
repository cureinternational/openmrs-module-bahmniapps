'use strict';

describe('GenderUtil', function () {
    var genderUtil = Bahmni.Common.Util.GenderUtil;

    describe('translateGender', function () {
        it('should update genderMap entry when translation exists', function () {
            var genderMap = { M: 'Male', F: 'Female' };
            var $translate = {
                instant: function (key) {
                    return key === 'GENDER_M' ? 'Male (translated)' : key;
                }
            };

            genderUtil.translateGender(genderMap, $translate);

            expect(genderMap.M).toEqual('Male (translated)');
            expect(genderMap.F).toEqual('Female');
        });

        it('should not update genderMap entry when translation key is returned unchanged', function () {
            var genderMap = { M: 'Male' };
            var $translate = {
                instant: function (key) {
                    return key;
                }
            };

            genderUtil.translateGender(genderMap, $translate);

            expect(genderMap.M).toEqual('Male');
        });
    });
});
