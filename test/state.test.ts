import { describe, expect, it } from 'vitest'
import { createState, workspaceDirFor, type ReviewJobRecord } from '../src/state.ts'
import { Config } from '../src/index.ts'
import { MockCredentials, TOKEN } from './helpers.ts'

function makeState(maxReviewRecords = 3) {
  const credentials = new MockCredentials()
  credentials.values.set('GITHUB_TOKEN', TOKEN)
  const config = Config({ maxReviewRecords }) as never
  const state = createState({ credentials }, config, async () => { throw new Error('unused') }, async () => { throw new Error('unused') })
  return state
}

function record(status: ReviewJobRecord['status']): ReviewJobRecord {
  return { status, repo: 'o/r', pr: 1, report: null }
}

describe('review-job record cap (maxReviewRecords)', () => {
  it('evicts the oldest settled record past the cap, never running ones', () => {
    const state = makeState(3)
    state.rememberRecord('github-review-1', record('completed'))
    state.rememberRecord('github-review-2', record('failed'))
    state.rememberRecord('github-review-3', record('killed'))
    state.rememberRecord('github-review-4', record('completed'))
    expect(state.records.has('github-review-1')).toBe(false)
    expect(state.records.has('github-review-2')).toBe(true)
    expect(state.records.has('github-review-3')).toBe(true)
    expect(state.records.has('github-review-4')).toBe(true)
  })

  it('keeps every record when only running jobs exceed the cap', () => {
    const state = makeState(2)
    state.rememberRecord('github-review-1', record('running'))
    state.rememberRecord('github-review-2', record('running'))
    state.rememberRecord('github-review-3', record('running'))
    expect(state.records.size).toBe(3)
    expect(state.records.has('github-review-1')).toBe(true)
  })
})

// opencharly/dsh-github#3: a `dsh web` deployment runs as a SERVICE whose process
// cwd is the service's working directory, NOT the session's workspace. The git-origin
// fallback must therefore run in the CALLING SESSION's creation cwd
// (`agent.session.header.cwd`), or every `gh_*` call that omits `ownerRepo` fails with
// "could not determine the target repository" even inside a real checkout.
describe('workspaceDirFor — the session cwd anchors the git-origin fallback', () => {
  const s = { session: { header: { cwd: '/work/session-checkout' } } }

  it('prefers the session cwd over the process cwd', () => {
    expect(workspaceDirFor({}, s)).toBe('/work/session-checkout')
  })

  it('lets an explicit config.workspaceDir override the session cwd', () => {
    expect(workspaceDirFor({ workspaceDir: '/configured' }, s)).toBe('/configured')
  })

  it('ignores a blank config override and falls back to the session cwd', () => {
    expect(workspaceDirFor({ workspaceDir: '   ' }, s)).toBe('/work/session-checkout')
  })

  it('falls back to process.cwd() when there is no agent or session cwd', () => {
    expect(workspaceDirFor({})).toBe(process.cwd())
    expect(workspaceDirFor({}, {})).toBe(process.cwd())
    expect(workspaceDirFor({}, { session: { header: {} } })).toBe(process.cwd())
  })
})

describe('resolveRepo — the git-origin fallback uses the session cwd', () => {
  function stateWithGit(runGit: (args: string[], opts: { cwd: string }) => Promise<{ stdout: string }>) {
    const credentials = new MockCredentials()
    credentials.values.set('GITHUB_TOKEN', TOKEN)
    const config = Config({}) as never
    return createState({ credentials }, config, runGit as never, async () => { throw new Error('unused') })
  }

  it('resolves from the origin remote found in the SESSION cwd, not the process cwd', async () => {
    const seen: string[] = []
    const state = stateWithGit(async (_args, opts) => {
      seen.push(opts.cwd)
      // Only the session checkout has a GitHub origin; the process cwd ($HOME-style)
      // fails exactly as the real `git remote get-url` does outside a checkout.
      if (opts.cwd !== '/work/session-checkout') throw new Error('fatal: not a git repository')
      return { stdout: 'https://github.com/opencharly/opencharly.git\n' }
    })
    const agent = { session: { header: { cwd: '/work/session-checkout' } } }
    const res = await state.resolveRepo(undefined, undefined, agent)
    expect(res).toEqual({ ok: true, repo: 'opencharly/opencharly' })
    expect(seen).toEqual(['/work/session-checkout'])
  })

  it('honors an explicit ownerRepo before any git inspection', async () => {
    const state = stateWithGit(async () => { throw new Error('git must not run') })
    const res = await state.resolveRepo('explicit/repo', undefined, { session: { header: { cwd: '/x' } } })
    expect(res).toEqual({ ok: true, repo: 'explicit/repo' })
  })
})
