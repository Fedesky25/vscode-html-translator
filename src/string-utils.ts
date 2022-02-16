export function charCodesOf(str: string): number[] {
    const len = str.length;
    const res: number[] = new Array(len);
    for(var i=0; i<len; i++) res[i] = str.charCodeAt(i);
    return res;
}

export function isLetterOrDigit(code: number) {
    return (code > 96 && code < 123) || // lowercase letters
    (code > 64 && code < 91) || // uppercase letters
    (code > 47 && code < 58); // digits
}

/**
 * Returns the index of the first non-white character after pos
 * @param str string
 * @param pos initial position
 * @returns 
 */
export function firstNonSpace(str: string, pos: number) {
    while(str[pos] === " ") pos++;
    return pos;
}

/**
 * Returns the index of the last non-white charcter before pos
 * @param str string
 * @param pos last position
 * @returns 
 */
export function lastNonSpace(str: string, pos: number) {
    while(str[pos] === " ") pos--;
    return pos;
}

/**
 * Checks whether the opening string is present before a index
 * @param what what string to match
 * @param test test string on which apply the comparison
 * @param pos starting index in the test string 
 * @returns 
 */
export function matchStringBefore(what: string, test: string, pos: number): boolean {
    const len = what.length;
    for(var i=0; i<len; i++)
        if(test[pos+i-len+1] !== what[i]) return false;
    return true;
}

/**
 * Checks whether the closing string is present after a index
 * @param what what string to match
 * @param test test string on which apply the comparison
 * @param pos starting index in the test string 
 * @returns 
 */
export function matchStringAfter(what: string, test: string, col: number): boolean {
    const len = what.length;
    for(var i=0; i<len; i++)
        if(test[col+i] !== what[i]) return false;
    return true;
}

/**
 * Retrieves the string that precedes the index
 * @param line line of text
 * @param col column index
 * @param allowedCodes array of allowed codes
 * @returns 
 */
export function getTypedBefore(line: string, col: number, allowedCodes: number[]): string {
    var code: number;
    var i: number = col
    do { code = line.charCodeAt(--i) }
    while (isLetterOrDigit(code) || allowedCodes.includes(code));
    return line.substring(i+1, col);
}

/**
 * Returns the index of the first char that is not a letter, digits, or one of the codes
 * @param line line of text
 * @param col column index
 * @param codes array of supplementary allowed char codes
 * @returns 
 */
export function firstNonTyping(line: string, col: number, codes: number[]): number {
    var code: number;
    var i: number = col-1;
    do { code = line.charCodeAt(++i) }
    while (isLetterOrDigit(code) || codes.includes(code));
    return i;
}

export function countNewLines(text: string): number {
    let count = 0;
    const len = text.length;
    for(var i=0; i<len; i++) if(text[i] === "\n") count++;
    return count;
}