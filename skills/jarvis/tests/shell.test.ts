import { expect, test } from 'claude-code/testing'

import { absolute, expand, isRisky, plan } from '../hooks/lib/shell'

test('rm -rf names the folder it deletes', () => {
  expect(plan('rm -rf photos-backup', '/work').targets.map(t => t.path)).toEqual(['photos-backup'])
})

test('a cd before rm moves where the path is read from', () => {
  expect(plan('cd sub && rm a.txt', '/work').targets[0]?.cwd).toBe('/work/sub')
})

test('a > redirect saves over its file', () => {
  expect(plan('echo hi > notes.txt', '/work').targets[0]).toEqual({ path: 'notes.txt', cwd: '/work', isOnlyIfFile: true, hasGlob: false })
})

test('a >> append overwrites nothing', () => {
  expect(isRisky(plan('echo hi >> notes.txt', '/work'))).toBe(false)
})

test('output thrown at /dev/null is not a file of yours', () => {
  expect(isRisky(plan('ls 2>/dev/null', '/work'))).toBe(false)
})

test('a quoted path with spaces stays one path', () => {
  expect(plan('rm "my files/a b.txt"', '/work').targets[0]?.path).toBe('my files/a b.txt')
})

test('a computed path cannot be pinned down', () => {
  expect(plan('rm -rf $(cat list.txt)', '/work').unresolved).toHaveLength(1)
})

test('mv puts both the source and the destination at risk', () => {
  expect(plan('mv a.txt b.txt', '/work').targets.map(t => t.path).slice(0, 2)).toEqual(['a.txt', 'b.txt'])
})

test('git reset --hard puts the repository at risk', () => {
  expect(plan('git reset --hard', '/work').gitResets).toEqual(['/work'])
})

test('find -delete is listed without its -delete', () => {
  expect(plan("find . -name '*.log' -delete", '/work').finds[0]?.args).toEqual(['.', '-name', '*.log'])
})

test('a delete inside bash -c is still seen', () => {
  expect(plan("bash -c 'rm old.txt'", '/work').targets[0]?.path).toBe('old.txt')
})

test('xargs rm decides its files too late to snapshot', () => {
  expect(plan('ls | xargs rm', '/work').unresolved).toHaveLength(1)
})

test('~ expands to the home folder', () => {
  expect(expand('~/x', { HOME: '/home/me' })).toBe('/home/me/x')
})

test('an unknown variable leaves the path unknown', () => {
  expect(expand('$NOPE/x', {})).toBeUndefined()
})

test('.. is resolved against the working folder', () => {
  expect(absolute('../a', '/w/b')).toBe('/w/a')
})
