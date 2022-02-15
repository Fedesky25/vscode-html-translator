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

export function getTyped(line: string, col: number, opening: string, closing: string, allowedCodes: number[]): string | null {
    var i: number;
    var j: number;
    var len: number;
    i = col;
    while(line[i] === " ") i++;
    len = closing.length;
    for(j=0; j<len; j++) if(line[i+j] !== closing[j]) return null;
    i = col-1;
    j = line.charCodeAt(i);
    while(isLetterOrDigit(j) || allowedCodes.includes(j)) j = line.charCodeAt(--i);
    const res = line.substring(i+1, col);
    while(line[i] === " ") i--;
    len = opening.length;
    for(j=0; j<len; j++) if(line[i-j] !== opening[len-1-j]) return null;
    return res;
}