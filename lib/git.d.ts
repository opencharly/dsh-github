/** Runs one git command with stdout captured; injectable for tests. */
export type GitRunner = (args: string[], options: {
    cwd: string;
    signal?: AbortSignal;
}) => Promise<{
    stdout: string;
}>;
/** Read-only snapshot of the git state a PR draft needs. */
export interface GitState {
    /** Current branch, or null outside a repository. */
    branch: string | null;
    /** Whether the working tree has uncommitted changes. */
    hasChanges: boolean;
    /** Porcelain status lines, capped. */
    changedFiles: string[];
    /** Oneline log of commits ahead of the upstream (or the latest commits). */
    commitsAhead: string[];
    /** `origin` remote URL, when configured. */
    remote: string | null;
    /** `owner/repo` parsed from the origin URL, when parseable. */
    repoFromRemote: string | null;
    /** First read failure that stopped collection; the rest stays partial. */
    error?: string;
}
/** Run the real git CLI with stdout captured (never logged). */
export declare function runGitCli(args: string[], options: {
    cwd: string;
    signal?: AbortSignal;
}): Promise<{
    stdout: string;
}>;
/**
 * Parse `owner/repo` out of common origin URL forms (https, ssh, git), for any
 * GitHub host.
 *
 * The host check accepts the origin host when it equals `apiHost`, OR when it equals
 * `apiHost` with a leading `api.` label stripped. Public GitHub's REST base is
 * `api.github.com` while its git origins are `github.com` — the same provider under an
 * `api.`-prefixed API endpoint — so a strict equality rejected every github.com checkout
 * (`repoFromRemoteUrl('https://github.com/o/r.git', 'api.github.com')` was null), which is
 * why the git-origin fallback could never fire (opencharly/dsh-github#3). GitHub Enterprise
 * keeps one host for both (`apiHost` = `git.example.com`), so the strip is a no-op there and
 * an unrelated host is still rejected.
 *
 * @param remote - raw `git remote get-url origin` output.
 * @param apiHost - the configured REST base's hostname (lowercased), e.g. `api.github.com`.
 * @returns `owner/repo`, or null when the URL is unparseable or foreign.
 */
export declare function repoFromRemoteUrl(remote: string, apiHost?: string): string | null;
/**
 * Collect the read-only git facts a PR draft needs, tolerating partial
 * failures: each command that fails records `error` and stops collection.
 * @param cwd - repository working directory.
 * @param runGit - git CLI runner; the real one by default.
 * @param signal - cancels collection.
 * @param apiHost - expected origin host for `owner/repo` parsing (`github.com` by default).
 * @returns the collected snapshot.
 */
export declare function readGitState(cwd: string, runGit?: GitRunner, signal?: AbortSignal, apiHost?: string): Promise<GitState>;
//# sourceMappingURL=git.d.ts.map