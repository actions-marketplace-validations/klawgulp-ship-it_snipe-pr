export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface AnalysisResult {
  summary: string;
  changeType: ChangeType;
  categories: CategoryGroup[];
  stats: ChangeStats;
  highlights: string[];
}

export interface CategoryGroup {
  name: string;
  emoji: string;
  files: string[];
}

export interface ChangeStats {
  filesChanged: number;
  additions: number;
  deletions: number;
  netLines: number;
}

export type ChangeType =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'docs'
  | 'test'
  | 'config'
  | 'style'
  | 'mixed';

const FILE_CATEGORIES: Record<string, { name: string; emoji: string; patterns: RegExp[] }> = {
  test: {
    name: 'Tests',
    emoji: '🧪',
    patterns: [
      /\.(test|spec)\.[jt]sx?$/,
      /__(tests|mocks)__\//,
      /test[s]?\//i,
      /\.test\./,
    ],
  },
  docs: {
    name: 'Documentation',
    emoji: '📝',
    patterns: [/\.md$/i, /docs?\//i, /README/i, /CHANGELOG/i, /LICENSE/i],
  },
  config: {
    name: 'Configuration',
    emoji: '⚙️',
    patterns: [
      /\.(json|ya?ml|toml|ini|env)$/,
      /\.config\.[jt]s$/,
      /Dockerfile/,
      /docker-compose/,
      /\.github\//,
      /\.eslint/,
      /\.prettier/,
      /tsconfig/,
    ],
  },
  style: {
    name: 'Styling',
    emoji: '🎨',
    patterns: [/\.(css|scss|sass|less|styled)\b/, /tailwind/, /\.svg$/],
  },
  migration: {
    name: 'Database',
    emoji: '🗄️',
    patterns: [/migrat/i, /schema/i, /seed/i, /\.sql$/],
  },
  ci: {
    name: 'CI/CD',
    emoji: '🔄',
    patterns: [/\.github\/workflows/, /\.gitlab-ci/, /Jenkinsfile/, /\.circleci/],
  },
  deps: {
    name: 'Dependencies',
    emoji: '📦',
    patterns: [/package(-lock)?\.json$/, /yarn\.lock$/, /pnpm-lock/, /Gemfile/, /requirements.*\.txt$/, /go\.(mod|sum)$/],
  },
  api: {
    name: 'API',
    emoji: '🔌',
    patterns: [/routes?\//i, /api\//i, /controllers?\//i, /handlers?\//i, /endpoints?\//i],
  },
  ui: {
    name: 'UI Components',
    emoji: '🖼️',
    patterns: [/components?\//i, /pages?\//i, /views?\//i, /\.[jt]sx$/],
  },
  core: {
    name: 'Core Logic',
    emoji: '🔧',
    patterns: [/src\//, /lib\//, /\.[jt]s$/],
  },
};

function categorizeFile(filename: string): string {
  for (const [key, cat] of Object.entries(FILE_CATEGORIES)) {
    if (cat.patterns.some((p) => p.test(filename))) {
      return key;
    }
  }
  return 'core';
}

function detectChangeType(files: FileChange[], patches: string): ChangeType {
  const categories = new Set(files.map((f) => categorizeFile(f.filename)));

  if (categories.size === 1 && categories.has('test')) return 'test';
  if (categories.size === 1 && categories.has('docs')) return 'docs';
  if (categories.size === 1 && categories.has('config')) return 'config';
  if (categories.size === 1 && categories.has('style')) return 'style';

  const lowerPatch = patches.toLowerCase();
  const bugSignals = ['fix', 'bug', 'patch', 'hotfix', 'issue', 'error', 'crash', 'broken'];
  const featureSignals = ['feat', 'add', 'new', 'implement', 'create', 'introduce'];
  const refactorSignals = ['refactor', 'rename', 'move', 'extract', 'simplify', 'clean'];

  const bugScore = bugSignals.filter((s) => lowerPatch.includes(s)).length;
  const featureScore = featureSignals.filter((s) => lowerPatch.includes(s)).length;
  const refactorScore = refactorSignals.filter((s) => lowerPatch.includes(s)).length;

  const maxScore = Math.max(bugScore, featureScore, refactorScore);
  if (maxScore === 0) return 'mixed';
  if (bugScore === maxScore) return 'bugfix';
  if (featureScore === maxScore) return 'feature';
  if (refactorScore === maxScore) return 'refactor';

  return 'mixed';
}

function extractHighlights(files: FileChange[]): string[] {
  const highlights: string[] = [];

  const newFiles = files.filter((f) => f.status === 'added');
  const deletedFiles = files.filter((f) => f.status === 'removed');
  const renamedFiles = files.filter((f) => f.status === 'renamed');

  if (newFiles.length > 0) {
    highlights.push(
      `Added ${newFiles.length} new file${newFiles.length > 1 ? 's' : ''}: ${newFiles
        .slice(0, 3)
        .map((f) => `\`${f.filename.split('/').pop()}\``)
        .join(', ')}${newFiles.length > 3 ? ` and ${newFiles.length - 3} more` : ''}`
    );
  }

  if (deletedFiles.length > 0) {
    highlights.push(
      `Removed ${deletedFiles.length} file${deletedFiles.length > 1 ? 's' : ''}`
    );
  }

  if (renamedFiles.length > 0) {
    highlights.push(
      `Renamed ${renamedFiles.length} file${renamedFiles.length > 1 ? 's' : ''}`
    );
  }

  const bigChanges = files
    .filter((f) => f.additions + f.deletions > 100)
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));

  if (bigChanges.length > 0) {
    const top = bigChanges[0];
    highlights.push(
      `Largest change: \`${top.filename.split('/').pop()}\` (+${top.additions}/-${top.deletions})`
    );
  }

  return highlights;
}

const CHANGE_TYPE_LABELS: Record<ChangeType, { emoji: string; label: string }> = {
  feature: { emoji: '✨', label: 'New Feature' },
  bugfix: { emoji: '🐛', label: 'Bug Fix' },
  refactor: { emoji: '♻️', label: 'Refactor' },
  docs: { emoji: '📝', label: 'Documentation' },
  test: { emoji: '🧪', label: 'Tests' },
  config: { emoji: '⚙️', label: 'Configuration' },
  style: { emoji: '🎨', label: 'Styling' },
  mixed: { emoji: '🔀', label: 'Mixed Changes' },
};

export function analyzeChanges(files: FileChange[], diff: string): AnalysisResult {
  const stats: ChangeStats = {
    filesChanged: files.length,
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    netLines: files.reduce((sum, f) => sum + f.additions - f.deletions, 0),
  };

  const changeType = detectChangeType(files, diff);
  const highlights = extractHighlights(files);

  // Group files by category
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const cat = categorizeFile(file.filename);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(file.filename);
  }

  const categories: CategoryGroup[] = [];
  for (const [key, filenames] of groups) {
    const catDef = FILE_CATEGORIES[key];
    if (catDef) {
      categories.push({ name: catDef.name, emoji: catDef.emoji, files: filenames });
    }
  }

  // Sort: largest groups first
  categories.sort((a, b) => b.files.length - a.files.length);

  const typeInfo = CHANGE_TYPE_LABELS[changeType];
  const summary = `${typeInfo.emoji} **${typeInfo.label}** — ${stats.filesChanged} file${stats.filesChanged !== 1 ? 's' : ''} changed (+${stats.additions}/-${stats.deletions})`;

  return { summary, changeType, categories, stats, highlights };
}

export function formatDescription(analysis: AnalysisResult, prTitle: string): string {
  const lines: string[] = [];

  lines.push(`## ${analysis.summary}`);
  lines.push('');

  // Highlights
  if (analysis.highlights.length > 0) {
    lines.push('### Highlights');
    for (const h of analysis.highlights) {
      lines.push(`- ${h}`);
    }
    lines.push('');
  }

  // File categories
  lines.push('### Changes');
  for (const cat of analysis.categories) {
    const fileList = cat.files
      .slice(0, 8)
      .map((f) => `\`${f}\``)
      .join(', ');
    const more = cat.files.length > 8 ? ` and ${cat.files.length - 8} more` : '';
    lines.push(`- ${cat.emoji} **${cat.name}**: ${fileList}${more}`);
  }
  lines.push('');

  // Stats bar
  const total = analysis.stats.additions + analysis.stats.deletions;
  const addPct = total > 0 ? Math.round((analysis.stats.additions / total) * 20) : 0;
  const delPct = 20 - addPct;
  const bar = '🟩'.repeat(addPct) + '🟥'.repeat(delPct);
  lines.push(`<sub>${bar} +${analysis.stats.additions} / -${analysis.stats.deletions} (net ${analysis.stats.netLines >= 0 ? '+' : ''}${analysis.stats.netLines})</sub>`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push(
    '<sub>Generated by <a href="https://snipelink.com">Snipe PR</a> — auto PR descriptions for your team | <a href="https://snipelink.com/tools">Get AI-powered descriptions →</a></sub>'
  );

  return lines.join('\n');
}
