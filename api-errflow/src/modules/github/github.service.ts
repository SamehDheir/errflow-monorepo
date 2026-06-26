import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { WebsocketService } from '../../websockets/websocket.service';

interface FileContentResult {
  content: string;
  sha: string;
}

interface PullRequestResult {
  prNumber: number;
  prUrl: string;
}

interface CommitFileParams {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  sha?: string;
}

interface OpenPullRequestParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

interface CreateFixPRParams {
  owner: string;
  repo: string;
  defaultBranch: string;
  filePath: string;
  fixedContent: string;
  originalSha: string;
  title: string;
  body: string;
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly prLabels: string[];

  constructor(
    private configService: ConfigService,
    private websocketService: WebsocketService,
  ) {
    this.prLabels = (this.configService.get<string>('GITHUB_PR_LABELS') || 'autopr,automated').split(',');
  }

  private createOctokit(token: string): Octokit {
    return new Octokit({ auth: token });
  }

  async getFileContent(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    branch: string,
  ): Promise<FileContentResult> {
    const octokit = this.createOctokit(token);

    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });

      const data = response.data as any;
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        content,
        sha: data.sha,
      };
    } catch (error: any) {
      this.logger.error(`GitHub API error: ${error.status} - ${error.message}`);
      this.logger.error(`Attempted: ${owner}/${repo}/${filePath}@${branch}`);
      if (error.status === 404) {
        throw new Error(`File not found in repository: ${filePath}`);
      }
      if (error.status === 403) {
        throw new Error(`Access denied to repository: ${owner}/${repo}`);
      }
      throw error;
    }
  }

  async createBranch(
    token: string,
    owner: string,
    repo: string,
    branchName: string,
    defaultBranch: string,
  ): Promise<void> {
    const octokit = this.createOctokit(token);

    const baseBranch = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });

    const baseSha = baseBranch.data.object.sha;

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
  }

  async commitFile(params: CommitFileParams, token: string): Promise<void> {
    const octokit = this.createOctokit(token);

    const body: any = {
      message: params.message,
      content: Buffer.from(params.content).toString('base64'),
      branch: params.branch,
    };

    if (params.sha) {
      body.sha = params.sha;
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: params.owner,
      repo: params.repo,
      path: params.filePath,
      ...body,
    });
  }

  async openPullRequest(
    params: OpenPullRequestParams,
    token: string,
  ): Promise<PullRequestResult> {
    const octokit = this.createOctokit(token);

    const response = await octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
      labels: this.prLabels,
    });

    return {
      prNumber: response.data.number,
      prUrl: response.data.html_url,
    };
  }

  async createFixPR(
    token: string,
    params: CreateFixPRParams,
    organizationId: string,
  ): Promise<PullRequestResult> {
    const branchName = `autopr/fix-${Date.now()}`;

    await this.createBranch(token, params.owner, params.repo, branchName, params.defaultBranch);

    await this.commitFile(
      {
        owner: params.owner,
        repo: params.repo,
        branch: branchName,
        filePath: params.filePath,
        content: params.fixedContent,
        message: `AutoPR: Fix for ${params.title}`,
        sha: params.originalSha,
      },
      token,
    );

    const prResult = await this.openPullRequest(
      {
        owner: params.owner,
        repo: params.repo,
        title: params.title,
        body: params.body,
        head: branchName,
        base: params.defaultBranch,
      },
      token,
    );

    // Send PR notification
    this.websocketService.sendPrNotification(organizationId, {
      id: `pr-${prResult.prNumber}`,
      number: prResult.prNumber,
      title: params.title,
      status: 'OPEN',
      url: prResult.prUrl,
      projectName: `${params.owner}/${params.repo}`,
      timestamp: new Date(),
    });

    return prResult;
  }

  async getPullRequestStatus(
    token: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ state: string; merged: boolean; mergeable?: boolean } | null> {
    const octokit = this.createOctokit(token);

    try {
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return {
        state: data.state,
        merged: data.merged,
        mergeable: data.mergeable,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get PR status: ${error.status} - ${error.message}`);
      return null;
    }
  }

  async getUserRepositories(token: string): Promise<any[]> {
    const octokit = this.createOctokit(token);

    try {
      // Get all repositories (owned + member)
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      });

      return response.data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        default_branch: repo.default_branch,
        private: repo.private,
        description: repo.description,
        language: repo.language,
        updated_at: repo.updated_at,
        permissions: repo.permissions,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to fetch user repositories: ${error.status} - ${error.message}`);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }
}
