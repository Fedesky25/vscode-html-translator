"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypedBefore = exports.matchStringAfter = exports.matchStringBefore = exports.lastNonSpace = exports.firstNonSpace = exports.isLetterOrDigit = exports.charCodesOf = void 0;
function charCodesOf(str) {
    const len = str.length;
    const res = new Array(len);
    for (var i = 0; i < len; i++)
        res[i] = str.charCodeAt(i);
    return res;
}
exports.charCodesOf = charCodesOf;
function isLetterOrDigit(code) {
    return (code > 96 && code < 123) || // lowercase letters
        (code > 64 && code < 91) || // uppercase letters
        (code > 47 && code < 58); // digits
}
exports.isLetterOrDigit = isLetterOrDigit;
/**
 * Returns the index of the first non-white character after pos
 * @param str string
 * @param pos initial position
 * @returns
 */
function firstNonSpace(str, pos) {
    while (str[pos] === " ")
        pos++;
    return pos;
}
exports.firstNonSpace = firstNonSpace;
/**
 * Returns the index of the last non-white charcter before pos
 * @param str string
 * @param pos last position
 * @returns
 */
function lastNonSpace(str, pos) {
    while (str[pos] === " ")
        pos--;
    return pos;
}
exports.lastNonSpace = lastNonSpace;
/**
 * Checks whether the opening string is present before a index
 * @param what what string to match
 * @param test test string on which apply the comparison
 * @param pos starting index in the test string
 * @returns
 */
function matchStringBefore(what, test, pos) {
    const len = what.length;
    for (var i = 0; i < len; i++)
        if (test[pos + i - len + 1] !== what[i])
            return false;
    return true;
}
exports.matchStringBefore = matchStringBefore;
/**
 * Checks whether the closing string is present after a index
 * @param what what string to match
 * @param test test string on which apply the comparison
 * @param pos starting index in the test string
 * @returns
 */
function matchStringAfter(what, test, col) {
    const len = what.length;
    for (var i = 0; i < len; i++)
        if (test[col + i] !== what[i])
            return false;
    return true;
}
exports.matchStringAfter = matchStringAfter;
/**
 * Retrieves the string that precedes the index
 * @param line line of text
 * @param col column index
 * @param allowedCodes array of allowed codes
 * @returns
 */
function getTypedBefore(line, col, allowedCodes) {
    var code;
    var i = col;
    do {
        code = line.charCodeAt(--i);
    } while (isLetterOrDigit(code) || allowedCodes.includes(code));
    return line.substring(i + 1, col);
}
exports.getTypedBefore = getTypedBefore;
//# sourceMappingURL=utils.js.map