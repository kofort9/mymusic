import { getCamelotColor, getCamelotNumber } from '../src/camelotColors';

describe('Camelot Colors', () => {
    test('extracts correct number from valid codes', () => {
        expect(getCamelotNumber('1A')).toBe(1);
        expect(getCamelotNumber('12B')).toBe(12);
        expect(getCamelotNumber('8A')).toBe(8);
    });

    test('returns correct color for valid codes', () => {
        expect(getCamelotColor('1A')).toBe('#0056B3'); // 1 -> Deep Blue
        expect(getCamelotColor('5B')).toBe('#FF0055'); // 5 -> Red
        expect(getCamelotColor('8A')).toBe('#FFFF00'); // 8 -> Yellow
    });

    test('returns white (#FFFFFF) for invalid codes', () => {
        expect(getCamelotColor('')).toBe('#FFFFFF');
        expect(getCamelotColor('invalid')).toBe('#FFFFFF');
        expect(getCamelotColor('0A')).toBe('#FFFFFF'); // 0 is invalid
        expect(getCamelotColor('13A')).toBe('#FFFFFF'); // 13 is invalid
    });
});
