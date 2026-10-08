import { describe, expect, it } from 'vitest'
import { repoFromRemoteUrl } from '../src/git.ts'

describe('repoFromRemoteUrl', () => {
  it('parses github.com origins in https, ssh, and git forms', () => {
    expect(repoFromRemoteUrl('https://github.com/o/r.git')).toBe('o/r')
    expect(repoFromRemoteUrl('git@github.com:o/r.git')).toBe('o/r')
    expect(repoFromRemoteUrl('ssh://git@github.com/o/r.git')).toBe('o/r')
    expect(repoFromRemoteUrl('git://github.com/o/r.git')).toBe('o/r')
    expect(repoFromRemoteUrl('https://github.com/o/r')).toBe('o/r')
  })

  it('defaults to github.com and rejects foreign hosts', () => {
    expect(repoFromRemoteUrl('https://github.com/o/r.git')).toBe('o/r')
    expect(repoFromRemoteUrl('https://gitlab.com/o/r.git')).toBeNull()
  })

  it('parses GitHub Enterprise origins when the API host matches', () => {
    expect(repoFromRemoteUrl('https://git.example.com/o/r.git', 'git.example.com')).toBe('o/r')
    expect(repoFromRemoteUrl('git@git.example.com:o/r.git', 'git.example.com')).toBe('o/r')
    expect(repoFromRemoteUrl('https://github.com/o/r.git', 'git.example.com')).toBeNull()
  })

  it('handles a port on the host', () => {
    expect(repoFromRemoteUrl('https://git.example.com:8443/o/r.git', 'git.example.com')).toBe('o/r')
  })

  it('rejects unparseable remotes', () => {
    expect(repoFromRemoteUrl('not a url')).toBeNull()
    expect(repoFromRemoteUrl('')).toBeNull()
    expect(repoFromRemoteUrl('https://example.com')).toBeNull()
  })

  // opencharly/dsh-github#3: public GitHub's REST base is `api.github.com` while its
  // git origins are `github.com` — the same provider under an `api.`-prefixed API
  // endpoint. A strict equality rejected every github.com origin, so the git-origin
  // fallback could never fire. The strip must accept the provider host but still
  // reject an unrelated one.
  it('accepts the provider host when apiHost carries an api. prefix (public GitHub)', () => {
    expect(repoFromRemoteUrl('https://github.com/o/r.git', 'api.github.com')).toBe('o/r')
    expect(repoFromRemoteUrl('git@github.com:o/r.git', 'api.github.com')).toBe('o/r')
    expect(repoFromRemoteUrl('https://api.github.com/o/r.git', 'api.github.com')).toBe('o/r')
    expect(repoFromRemoteUrl('https://gitlab.com/o/r.git', 'api.github.com')).toBeNull()
  })
})
