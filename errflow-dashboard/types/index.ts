export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type ErrorStatus = 'RECEIVED' | 'QUEUED' | 'PROCESSING' | 'FIX_READY' | 'FAILED' | 'IGNORED';
export type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PRStatus = 'OPEN' | 'MERGED' | 'CLOSED';
export type NotificationChannel = 'EMAIL' | 'SLACK' | 'DISCORD';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  fixesLimit: number;
  fixesUsedThisMonth: number;
  usersCount: number;
  projectsCount: number;
  members: User[];
}

export interface Project {
  id: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  defaultBranch: string;
  status: 'ACTIVE' | 'INACTIVE';
  organizationId: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  label: string;
  isActive: boolean;
  projectId: string;
  createdAt: string;
}

export interface ErrorEvent {
  id: string;
  message: string;
  stack: string;
  file: string;
  line: number;
  severity: ErrorSeverity;
  status: ErrorStatus;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  projectId: string;
  project: Project;
  fixAttempts: FixAttempt[];
  pullRequests: PullRequest[];
}

export type FixStatus = 'PENDING' | 'ANALYZING' | 'GENERATING' | 'TESTING' | 'SUCCESS' | 'FAILED' | 'NEEDS_MANUAL_REVIEW';

export interface FixAttempt {
  id: string;
  errorId: string;
  status: FixStatus;
  targetFile?: string;
  confidence: number;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  rootCause: string;
  pullRequest: PullRequest | null;
  pullRequests?: PullRequest[];
  testsPassed?: boolean;
  failureReason?: string;
  requiresManualReview?: boolean;
  changedLines?: number;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  branch: string;
  status: PRStatus;
  confidence: number;
  testsPassed: boolean;
  testsSkipped: boolean;
  testsFailed: boolean;
  url: string;
  errorId: string;
  projectId: string;
  project?: Project;
  projectName?: string;
  createdAt: string;
  mergedAt: string | null;
}

export interface Notification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorId: string;
  createdAt: string;
}

export interface StatsOverview {
  totalErrors: number;
  fixedThisMonth: number;
  fixSuccessRate: number;
  avgConfidenceScore: number;
  fixesUsed: number;
  fixesLimit: number;
  plan: Plan;
  topErrors: Array<{
    message: string;
    count: number;
  }>;
}

export interface TimelineEntry {
  date: string;
  errorsReceived: number;
  fixesOpened: number;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface OrganizationUsage {
  fixesUsed: number;
  fixesLimit: number;
  percentUsed: number;
  billingCycleStart: string;
  billingCycleEnd: string;
  daysRemaining: number;
}

export interface UpdatePlanRequest {
  plan: Plan;
}

export interface IngestRequest {
  message: string;
  stack: string;
  environment: string;
  timestamp: string;
  runtime: string;
  metadata?: Record<string, any>;
}

export interface IngestResponse {
  id: string;
  status: ErrorStatus;
  severity: ErrorSeverity;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  prefix: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}
