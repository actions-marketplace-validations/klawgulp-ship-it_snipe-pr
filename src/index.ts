import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeChanges, formatDescription, FileChange } from './analyzer';
import { generateAIDescription } from './ai';

const COMMENT_MARKER = '<!-- snipe-pr-description -->';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const snipelinkKey = core.getInput('snipelink-key');
    const mode = core.getInput('mode') || 'comment';
    const includeStats = core.getInput('include-stats') !== 'false';
    const maxDiffSize = parseInt(core.getInput('max-diff-size') || '10000', 10);

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const pr = github.context.payload.pull_request;

    if (!pr) {
      core.setFailed('This action only runs on pull_request events.');
      return;
    }

    const pullNumber = pr.number;
    const prTitle = pr.title || '';

    core.info(`Analyzing PR #${pullNumber}: ${prTitle}`);

    // Fetch diff
    const { data: diffData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: 'diff' },
    });
    const diff = (typeof diffData === 'string' ? diffData : String(diffData)).substring(
      0,
      maxDiffSize
    );

    // Fetch changed files
    const allFiles: FileChange[] = [];
    let page = 1;
    while (true) {
      const { data: filesPage } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
        page,
      });
      if (filesPage.length === 0) break;
      for (const f of filesPage) {
        allFiles.push({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch,
        });
      }
      if (filesPage.length < 100) break;
      page++;
    }

    core.info(`Found ${allFiles.length} changed files`);

    let description: string;

    // Try AI-powered description if SnipeLink key provided
    if (snipelinkKey) {
      core.info('SnipeLink API key detected — generating AI-powered description...');
      const aiResult = await generateAIDescription(
        { title: prTitle, diff, files: allFiles, repo: `${owner}/${repo}` },
        snipelinkKey
      );

      if (aiResult.ok && aiResult.description) {
        description = aiResult.description;
        description += '\n\n---';
        description +=
          '\n<sub>AI-powered by <a href="https://snipelink.com">Snipe PR Pro</a> — smarter PR descriptions for your team</sub>';
        core.info('AI description generated successfully');
      } else {
        core.warning(
          `AI generation failed (${aiResult.error}), falling back to template-based description`
        );
        const analysis = analyzeChanges(allFiles, diff);
        description = formatDescription(analysis, prTitle);
      }
    } else {
      // Free tier: template-based analysis
      const analysis = analyzeChanges(allFiles, diff);
      description = formatDescription(analysis, prTitle);
    }

    // Prepend marker for idempotent updates
    const body = `${COMMENT_MARKER}\n${description}`;

    if (mode === 'body') {
      // Update PR body
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: pullNumber,
        body: body,
      });
      core.info('Updated PR body with generated description');
    } else {
      // Post or update comment
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      });

      const existing = comments.find(
        (c) =>
          c.user?.login === 'github-actions[bot]' && c.body?.includes(COMMENT_MARKER)
      );

      if (existing) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existing.id,
          body,
        });
        core.info(`Updated existing comment (ID: ${existing.id})`);
        core.setOutput('comment-id', existing.id.toString());
      } else {
        const { data: newComment } = await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pullNumber,
          body,
        });
        core.info(`Posted new comment (ID: ${newComment.id})`);
        core.setOutput('comment-id', newComment.id.toString());
      }
    }

    core.setOutput('description', description);
    core.info('Snipe PR completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
