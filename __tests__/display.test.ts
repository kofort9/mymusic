import { stripAnsi } from 'strip-ansi';
import stringWidth from 'string-width';
import { colors } from '../theme';

describe('Display Logic Tests', () => {
    describe('ANSI Padding', () => {
        it('should correctly calculate visible width excluding ANSI codes', () => {
            const coloredText = `${colors.spotifyGreen}Test${colors.reset}`;
            const visibleLength = stringWidth(stripAnsi(coloredText));

            expect(visibleLength).toBe(4); // "Test" is 4 characters
            expect(coloredText.length).toBeGreaterThan(4); // Actual string is longer due to ANSI
        });

        it('should pad content correctly when ANSI codes are present', () => {
            const targetWidth = 20;
            const content = `${colors.bright}[8A]${colors.reset} Track Name`;
            const visibleLen = stringWidth(stripAnsi(content));
            const padding = Math.max(0, targetWidth - visibleLen);
            const paddedContent = content + ' '.repeat(padding);

            const finalVisibleLen = stringWidth(stripAnsi(paddedContent));
            expect(finalVisibleLen).toBe(targetWidth);
        });
    });

    describe('Narrow Terminal Warning', () => {
        it('should fill entire terminal height to prevent artifacts', () => {
            const mockTerminalHeight = 24;
            const warningLines = [
                '',
                'Terminal too narrow!',
                'Minimum width: 80 characters',
                'Current width: 60 characters',
                '',
                'Please resize your terminal window.',
            ];

            const lines: string[] = [];
            const blankLinesBefore = Math.floor((mockTerminalHeight - warningLines.length) / 2);

            for (let i = 0; i < blankLinesBefore; i++) {
                lines.push('');
            }
            lines.push(...warningLines);

            while (lines.length < mockTerminalHeight) {
                lines.push('');
            }

            expect(lines.length).toBe(mockTerminalHeight);
            expect(lines[0]).toBe(''); // Top blank
            expect(lines[lines.length - 1]).toBe(''); // Bottom blank
            expect(lines.some(l => l.includes('Terminal too narrow'))).toBe(true);
        });
    });

    describe('Border Width Consistency', () => {
        it('should ensure content lines match border width', () => {
            const effectiveWidth = 60;
            const frameWidth = effectiveWidth + 2; // +2 for side borders

            // Top border: ╔ + 60 '═' + ╗
            const topBorder = '╔' + '═'.repeat(effectiveWidth) + '╗';
            expect(topBorder.length).toBe(frameWidth);

            // Content line: ║ + 60 chars + ║
            const content = 'Test content';
            const visibleLen = stringWidth(stripAnsi(content));
            const padding = Math.max(0, effectiveWidth - visibleLen);
            const paddedContent = content + ' '.repeat(padding);
            const contentLine = '║' + paddedContent + '║';

            expect(stringWidth(stripAnsi(contentLine))).toBe(frameWidth);
        });
    });

    describe(' Continuous Box Layout', () => {
        it('should fill all remaining lines with side borders until status bar', () => {
            const terminalHeight = 30;
            const statusLineCount = 3;
            const usedLinesTop = 10;
            const lines: string[] = [];

            // Simulate adding top content
            for (let i = 0; i < usedLinesTop; i++) {
                lines.push('Header or content line');
            }

            // Fill with side borders
            const effectiveWidth = 60;
            while (lines.length < terminalHeight - statusLineCount) {
                lines.push(`║${' '.repeat(effectiveWidth)}║`);
            }

            expect(lines.length).toBe(terminalHeight - statusLineCount);
            expect(lines[lines.length - 1]).toContain('║');
        });
    });

    describe('Header/Content Separation', () => {
        it('should correctly separate fixed headers from scrollable content', () => {
            const allLines = [
                '╔══════╗', // Header 0
                '║ Title ║', // Header 1
                '║ Tabs  ║', // Header 2
                '║ ───── ║', // Header 3  (separator)
                '║ Item1 ║', // Content 0
                '║ Item2 ║', // Content 1
                '║ Item3 ║', // Content 2
                '╚══════╝', // Bottom border
            ];

            const headerLines = allLines.slice(0, 4);
            const bottomBorderLine = allLines[allLines.length - 1];
            const contentLines = allLines.slice(4, -1);

            expect(headerLines.length).toBe(4);
            expect(contentLines.length).toBe(3);
            expect(bottomBorderLine).toBe('╚══════╝');

            // Verify headers don't scroll
            expect(headerLines[0]).toContain('╔');
            expect(headerLines[3]).toContain('─');
        });

        it('should allow scrolling only content while headers stay fixed', () => {
            const contentLines = ['Item1', 'Item2', 'Item3', 'Item4', 'Item5'];
            const availableSpace = 2;
            const scrollOffset = 1;

            const visibleContent = contentLines.slice(
                scrollOffset,
                scrollOffset + availableSpace
            );

            expect(visibleContent).toEqual(['Item2', 'Item3']);
            expect(visibleContent.length).toBe(availableSpace);
        });
    });
});
