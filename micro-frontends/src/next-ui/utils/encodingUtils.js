export function unescapeHtml (str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

export function deepUnescapeStrings (obj) {
    if (typeof obj === 'string') {
        return unescapeHtml(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(deepUnescapeStrings);
    }
    if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = deepUnescapeStrings(obj[key]);
        }
        return result;
    }
    return obj;
}
