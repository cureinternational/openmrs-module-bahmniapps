'use strict';

Bahmni.Common.Util.unescapeHtml = function (str) {
    if (!angular.isString(str)) return str;
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
};

Bahmni.Common.Util.deepUnescapeStrings = function (obj) {
    if (angular.isString(obj)) {
        return Bahmni.Common.Util.unescapeHtml(obj);
    }
    if (angular.isArray(obj)) {
        return obj.map(Bahmni.Common.Util.deepUnescapeStrings);
    }
    if (typeof obj === 'object' && obj !== null) {
        var result = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key] = Bahmni.Common.Util.deepUnescapeStrings(obj[key]);
            }
        }
        return result;
    }
    return obj;
};
