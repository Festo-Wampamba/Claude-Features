import { expect, test } from 'claude-code/testing'

import {
  appendRule,
  isCheckCommand,
  isCorrection,
  isSameCorrection,
  isTestRun,
  learnNames,
  redact,
  scanSlop,
  toRule,
} from '../hooks/lib/text'

const EMAIL_LINE = 'Write to my client Sam Patel at sam.patel@example.com, phone 555-0142, key sk-demo-4f9a2c7e'

test('Stream Safe hides an email', () => {
  expect(redact('mail sam.patel@example.com', {})).toBe('mail [email]')
})

test('Stream Safe hides a phone number', () => {
  expect(redact('call 555-0142 now', {})).toBe('call [phone] now')
})

test('Stream Safe hides an API key', () => {
  expect(redact('key sk-demo-4f9a2c7e', {})).toBe('key [secret]')
})

test('Stream Safe gives a client a stand-in name', () => {
  expect(redact(EMAIL_LINE, learnNames({}, EMAIL_LINE))).toBe('Write to my client Client A at [email], phone [phone], key [secret]')
})

test('the same person keeps the same stand-in', () => {
  const names = learnNames(learnNames({}, 'my client Sam Patel'), 'and my client Ana Ruiz')
  expect(redact('Sam Patel and Ana Ruiz', names)).toBe('Client A and Client B')
})

test('Slop Spotter flags a hype word', () => {
  expect(scanSlop('This is a game-changer.')[0]?.kinds).toEqual(['hype'])
})

test('Slop Spotter flags a long dash', () => {
  expect(scanSlop('Fast — and simple')[0]?.kinds).toEqual(['dash'])
})

test('Slop Spotter flags a neat list of three', () => {
  expect(scanSlop('It is fast, simple, and fun.')[0]?.kinds).toEqual(['triad'])
})

test('plain writing raises nothing', () => {
  expect(scanSlop('We shipped the export button today.')).toEqual([])
})

test('Rule Keeper hears a correction', () => {
  expect(isCorrection("Don't use em dashes.")).toBe(true)
})

test('two wordings of one correction count as the same', () => {
  expect(isSameCorrection("Don't use em dashes.", 'Stop using long dashes')).toBe(true)
})

test('different corrections do not count as the same', () => {
  expect(isSameCorrection("Don't use em dashes.", 'Never commit to main')).toBe(false)
})

test('a correction becomes a one-line rule', () => {
  expect(toRule("don't use em dashes. I mean it")).toBe("Don't use em dashes.")
})

test('a saved rule is never written twice', () => {
  const once = appendRule('# Mine\n', "Don't use em dashes.")
  expect(appendRule(once, "Don't use em dashes.")).toBe(once)
})

test('pnpm test is a real test run', () => {
  expect(isTestRun('pnpm test')).toBe(true)
})

test('reading a file is not a check', () => {
  expect(isCheckCommand('cat signup.html')).toBe(false)
})
