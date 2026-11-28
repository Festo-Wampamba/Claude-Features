import { expect, test } from 'claude-code/testing'

import { statusLine } from '../hooks/core'
import { buildView } from '../hooks/mods/context-xray'
import { totalLine } from '../hooks/mods/mission-control'
import { clashesOf, risksOf, scanSource } from '../hooks/mods/mod-doctor'
import { PIP_GRID, pipRows, pipSays } from '../hooks/mods/pip'
import { unverifiedLine } from '../hooks/mods/proof-check'
import { slopSummary } from '../hooks/mods/slop-spotter'
import { blockMessage, filesLabel, outermost } from '../hooks/mods/undo-point'

test('one file is a file, not files', () => {
  expect(filesLabel(1)).toBe('1 file')
})

test('a folder of three says 3 files', () => {
  expect(filesLabel(3)).toBe('3 files')
})

test('a block says why', () => {
  expect(blockMessage('the disk is full')).toContain('the disk is full')
})

test('a file inside a listed folder is not copied twice', () => {
  expect(outermost(['/w/a', '/w/a/b.txt', '/w/c'])).toEqual(['/w/a', '/w/c'])
})

test('Proof Check names what changed', () => {
  expect(unverifiedLine(['/w/signup.html'])).toBe('Unverified: changed signup.html but ran no test, build or browser check')
})

test('Mission Control totals its helpers', () => {
  const card = { id: 'a', description: 'x', status: 'running', model: '', turnId: null }
  expect(totalLine([{ ...card, usd: 0.25 }, { ...card, id: 'b', usd: 0.4 }])).toBe('2 agents • $0.65 so far')
})

test('Context X-Ray flags a connected tool Claude never used', () => {
  const view = buildView({ tokens: 24000, window: 200000 }, [], [{ name: 'mcp__x__search', tokens: 7100, isLoaded: true }], [])
  expect(view.unused).toEqual([{ name: 'mcp__x__search', tokens: 7100 }])
})

test('Context X-Ray reads how full the window is', () => {
  expect(buildView({ tokens: 24000, window: 200000 }, [], [], []).percent).toBe(12)
})

test('Mod Doctor marks a mod that writes files as risky', () => {
  expect(risksOf([], ['fs.write'])).toContainEqual({ text: 'can change your files', isRisky: true })
})

test('Mod Doctor warns when two mods watch deletes', () => {
  const mod = { root: '/r', calls: [], risks: [] }
  expect(clashesOf([{ ...mod, name: 'jarvis', events: ['tool.call'] }, { ...mod, name: 'demo-mod', events: ['tool.call'] }])).toHaveLength(1)
})

test('Mod Doctor reads the events a mod hooks from its source', () => {
  expect(scanSource("on('tool.call', ($, e, next) => next(e))").events).toEqual(['tool.call'])
})

test('Pip is the 12x8 dog from the kit', () => {
  expect(PIP_GRID.map(row => row.length)).toEqual([12, 12, 12, 12, 12, 12, 12, 12])
})

test('Pip draws in four rows of half blocks', () => {
  expect(pipRows('#ffffff', false).map(row => row.length)).toEqual([12, 12, 12, 12])
})

test('Pip says the line the kit asks for when a command fails', () => {
  expect(pipSays('worried', 0)).toBe('Uh oh - a command failed')
})

test('the status line lists what is on, Stream Safe off by default', () => {
  expect(statusLine({})).toMatch(/^Jarvis 10\/11 on: Undo Point · Proof Check/)
})

test('the status line says Stream Safe ON when it is', () => {
  expect(statusLine({ stream: true })).toMatch(/^Stream Safe ON · /)
})

test('Slop Spotter sums up a reply in one line instead of copying it', () => {
  expect(slopSummary('A seamless fix — `/jarvis` opens it.\nIt is fast, simple, and fun.')).toBe('Slop Spotter: hype "seamless"; 1 long dash; 1 list of three')
})

test('Slop Spotter says nothing about a plain reply', () => {
  expect(slopSummary('We shipped the export button today.')).toBeUndefined()
})
