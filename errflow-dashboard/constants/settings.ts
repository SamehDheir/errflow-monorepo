export const SETTINGS_TABS = [
  { value: "general", label: "General" },
  { value: "projects", label: "Projects" },
  { value: "api-keys", label: "API Keys" },
  { value: "notifications", label: "Notifications" },
  { value: "usage", label: "Usage & Plan" },
] as const

export const PROJECT_FIELDS = [
  { field: "name", label: "Project Name", placeholder: "My App" },
  { field: "githubOwner", label: "GitHub Owner", placeholder: "username" },
  { field: "githubRepo", label: "GitHub Repo", placeholder: "repository" },
  { field: "defaultBranch", label: "Default Branch", placeholder: "main" },
] as const

export const PLAN_COMPARISON = [
  ["Fixes/month", "10", "100", "Unlimited"],
  ["Projects", "1", "5", "Unlimited"],
  ["Email notifications", "✓", "✓", "✓"],
  ["Support", "Community", "Priority", "Dedicated"],
] as const

export const NOTIFICATION_SEVERITY_OPTIONS = [
  { value: "ALL", label: "All errors" },
  { value: "HIGH", label: "HIGH and above" },
  { value: "CRITICAL", label: "CRITICAL only" },
] as const

export const DEFAULT_VALUES = {
  project: {
    defaultBranch: "main",
  },
  notification: {
    severity: "HIGH",
  },
} as const
