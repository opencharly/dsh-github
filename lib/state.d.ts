/**
 * Shared per-plugin-instance state handed to tools, commands, and the review
 * job: configuration, the credentials seam, the in-memory review-job records,
 * and repo / PR-reference resolution helpers.
 *
 * The records map is the only mutable state; it lives exactly as long as the
 * plugin fiber, mirroring the process-local lifetime of the host job registry,
 * and is capped by `maxReviewRecords` (oldest settled records evict first).
 * @module dsh-github/state
 */
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials';
import { GithubClient, GithubGraphqlClient, type RateLimitInfo } from './github.js';
import { type GitRunner } from './git.js';
import { type GhRunner, type TokenResolution } from './credential.js';
import type { SubagentsService } from './types.js';
import type { ReviewReport } from './review.js';
import { type Config } from './config.js';
/** Result of resolving which repository a call targets. */
export type RepoResolution = {
    ok: true;
    repo: string;
} | {
    ok: false;
    code: string;
    message: string;
    guidance: string;
};
/** A parsed PR reference: repository (when explicit) plus the PR number. */
export interface PrRef {
    number: number;
    /** `owner/repo` when the reference names one explicitly. */
    repo?: string;
}
/** In-memory record of one background review job, keyed by job id. */
export interface ReviewJobRecord {
    status: 'running' | 'completed' | 'failed' | 'killed';
    repo: string;
    pr: number;
    /** Head-commit SHA of the reviewed PR, captured for inline review posting. */
    headSha?: string;
    /** One-line CI check summary captured by the job (when requested). */
    ciSummary?: string;
    /** Count of existing review comments captured by the job (when requested). */
    commentsCount?: number;
    report: ReviewReport | null;
    error?: string;
}
export interface GithubState {
    config: Config;
    credentials: CredentialProvider;
    /** Host subagent seam; present when composed (used by model review). */
    subagents?: SubagentsService;
    records: Map<string, ReviewJobRecord>;
    /** Read-only git runner (injectable in tests). */
    runGit: GitRunner;
    /** gh CLI runner (injectable in tests). */
    runGh: GhRunner;
    /** Resolves the token per operation; never cached across operations. */
    resolveToken(signal?: AbortSignal): Promise<TokenResolution>;
    /** Builds an authenticated client for one operation. */
    client(token: string): GithubClient;
    /** Builds an authenticated GraphQL client for one operation. */
    graphqlClient(token: string): GithubGraphqlClient;
    /** Resolves `owner/repo` from an explicit argument, the configured default, or the workspace git origin. */
    resolveRepo(ownerRepo: string | undefined, signal?: AbortSignal): Promise<RepoResolution>;
    /** Parses `123`, `#123`, `owner/repo#123`, or a pull-request URL. */
    parsePrRef(input: string): PrRef | null;
    /** Working directory for git inspection. */
    workspaceDir: string;
    /** Hostname of the configured REST API base, for origin-URL matching. */
    apiHost: string;
    /** True while this process is the composite action's CI driver (`DSH_GITHUB_CI_DRIVER=1`). */
    isCiDriver: boolean;
    /** Register one review-job record, evicting settled records past the cap. */
    rememberRecord(id: string, record: ReviewJobRecord): void;
}
/**
 * The one canonical remedy text for a call that names no repository.
 *
 * It names ONLY remedies the caller can actually carry out from wherever the
 * plugin runs. The former third clause — "or run inside a checkout with a GitHub
 * origin remote" — is deliberately gone: that leg reads the git origin in the
 * PLUGIN HOST process's cwd, which a `dsh web` deployment sets to the service's
 * working directory rather than the session's checkout, so in that deployment the
 * advice could never be acted on (opencharly/dsh-github#3).
 */
export declare const REPO_GUIDANCE = "Pass ownerRepo, or configure defaultOwnerRepo for this plugin.";
/**
 * The one canonical `ownerRepo` argument description shared by every repo-targeting
 * tool (the tools themselves and the `/ci` tool), so the resolution order is stated
 * ONCE and cannot drift between surfaces.
 */
export declare const OWNER_REPO_DESCRIPTION = "Repository as owner/repo. Falls back to the configured defaultOwnerRepo, then the working directory's git origin (absent in a web deployment).";
/**
 * Create the shared plugin state. Called once per plugin instance (per
 * cordis.yml row); config hot-reload creates a fresh instance.
 * @param ctx - context holding the credentials seam and (optionally) the subagent seam.
 * @param config - validated configuration.
 * @param runGit - read-only git runner (injectable in tests).
 * @param runGh - gh CLI runner (injectable in tests).
 * @param fetchImpl - fetch implementation (injectable in tests).
 */
export declare function createState(ctx: {
    credentials: CredentialProvider;
    subagents?: SubagentsService;
}, config: Config, runGit: GitRunner, runGh: GhRunner, fetchImpl?: typeof fetch): GithubState;
/**
 * Resolve the target repository, in precedence order:
 *
 *   1. an explicit `ownerRepo` argument (the only leg a caller fully controls);
 *   2. the configured `defaultOwnerRepo`;
 *   3. the git origin of {@link GithubState.workspaceDir}.
 *
 * Leg 3 is real for a CLI/TUI session, whose cwd is the checkout. It is ABSENT in a
 * `dsh web` deployment, where the plugin host's cwd is the SERVICE's working
 * directory and not the session's workspace — and no host capability exposes a
 * session's workspace root to a plugin (the injected services are exactly
 * `['tools','commands','jobs','approval','credentials']`; see
 * opencharly/dsh-github#3). A web deployment must therefore name the repository
 * explicitly or configure `defaultOwnerRepo`; nothing else can resolve it there.
 *
 * This is why the guidance text names only legs 1 and 2, and why a call that omits
 * `ownerRepo` and has no configured default fails LOUDLY instead of guessing.
 */
export declare function resolveRepo(state: GithubState, ownerRepo: string | undefined, signal?: AbortSignal): Promise<RepoResolution>;
/** Parses PR references: `123`, `#123`, `owner/repo#123`, or a pull URL. */
export declare function parsePrRef(input: string): PrRef | null;
/** Shared shape of rate-limit facts on tool results. */
export type RateLimitValue = {
    remaining: number | null;
    resetAt: number | null;
};
export declare function rateLimitValue(info: RateLimitInfo): RateLimitValue;
//# sourceMappingURL=state.d.ts.map