import { analyzeChanges, formatDescription, FileChange } from '../src/analyzer';

describe('analyzeChanges', () => {
  it('detects feature changes', () => {
    const files: FileChange[] = [
      { filename: 'src/newFeature.ts', status: 'added', additions: 50, deletions: 0 },
      { filename: 'src/index.ts', status: 'modified', additions: 5, deletions: 2 },
    ];
    const diff = 'add new feature implement create';
    const result = analyzeChanges(files, diff);

    expect(result.changeType).toBe('feature');
    expect(result.stats.filesChanged).toBe(2);
    expect(result.stats.additions).toBe(55);
    expect(result.stats.deletions).toBe(2);
  });

  it('detects bugfix changes', () => {
    const files: FileChange[] = [
      { filename: 'src/auth.ts', status: 'modified', additions: 3, deletions: 5 },
    ];
    const diff = 'fix bug error crash issue';
    const result = analyzeChanges(files, diff);

    expect(result.changeType).toBe('bugfix');
  });

  it('detects test-only changes', () => {
    const files: FileChange[] = [
      { filename: 'src/__tests__/auth.test.ts', status: 'added', additions: 40, deletions: 0 },
      { filename: 'src/auth.spec.ts', status: 'modified', additions: 10, deletions: 5 },
    ];
    const result = analyzeChanges(files, '');

    expect(result.changeType).toBe('test');
  });

  it('detects docs-only changes', () => {
    const files: FileChange[] = [
      { filename: 'README.md', status: 'modified', additions: 20, deletions: 5 },
      { filename: 'docs/setup.md', status: 'added', additions: 50, deletions: 0 },
    ];
    const result = analyzeChanges(files, '');

    expect(result.changeType).toBe('docs');
  });

  it('categorizes files correctly', () => {
    const files: FileChange[] = [
      { filename: 'src/components/Button.tsx', status: 'modified', additions: 10, deletions: 5 },
      { filename: 'src/api/routes/users.ts', status: 'added', additions: 30, deletions: 0 },
      { filename: 'package.json', status: 'modified', additions: 2, deletions: 1 },
      { filename: 'src/__tests__/button.test.tsx', status: 'added', additions: 20, deletions: 0 },
    ];
    const result = analyzeChanges(files, '');

    const categoryNames = result.categories.map((c) => c.name);
    expect(categoryNames).toContain('Tests');
    expect(categoryNames).toContain('Configuration');
  });

  it('highlights new files', () => {
    const files: FileChange[] = [
      { filename: 'src/newService.ts', status: 'added', additions: 100, deletions: 0 },
      { filename: 'src/types.ts', status: 'added', additions: 30, deletions: 0 },
    ];
    const result = analyzeChanges(files, '');

    expect(result.highlights.some((h) => h.includes('Added 2 new files'))).toBe(true);
  });

  it('highlights large changes', () => {
    const files: FileChange[] = [
      { filename: 'src/bigRefactor.ts', status: 'modified', additions: 200, deletions: 150 },
    ];
    const result = analyzeChanges(files, '');

    expect(result.highlights.some((h) => h.includes('Largest change'))).toBe(true);
  });
});

describe('formatDescription', () => {
  it('generates valid markdown', () => {
    const files: FileChange[] = [
      { filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 },
    ];
    const analysis = analyzeChanges(files, 'fix a bug in auth');
    const md = formatDescription(analysis, 'Fix auth bug');

    expect(md).toContain('##');
    expect(md).toContain('Changes');
    expect(md).toContain('Snipe PR');
    expect(md).toContain('snipelink.com');
  });

  it('includes stats bar', () => {
    const files: FileChange[] = [
      { filename: 'src/a.ts', status: 'modified', additions: 50, deletions: 10 },
    ];
    const analysis = analyzeChanges(files, '');
    const md = formatDescription(analysis, 'Test');

    expect(md).toContain('🟩');
    expect(md).toContain('+50');
    expect(md).toContain('-10');
  });
});
