/**
 * Guards the app-wide keyboard conventions from constants/keyboard.ts.
 *
 * - Every ScrollView / FlatList / SectionList must spread `keyboardScrollProps`; without it the
 *   first tap on a row only dismisses the keyboard and the row's onPress never fires.
 * - Every search/filter TextInput must spread `searchInputProps`; autocorrect rewrites partly
 *   typed food names and reshuffles live results.
 *
 * These are source-level checks because the failure only shows up on a device with a keyboard up.
 */
import * as fs from 'fs';
import * as path from 'path';
import { keyboardScrollProps, searchInputProps } from '@/constants/keyboard';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIRS = ['app', 'components'];

function collectSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectSourceFiles(full);
    }
    return full.endsWith('.tsx') ? [full] : [];
  });
}

const files = SOURCE_DIRS.flatMap((dir) => collectSourceFiles(path.join(ROOT, dir)));

const count = (source: string, pattern: RegExp) => (source.match(pattern) ?? []).length;

describe('keyboard conventions', () => {
  it('scans a non-trivial set of files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('keeps taps working while the keyboard is open', () => {
    expect(keyboardScrollProps.keyboardShouldPersistTaps).toBe('handled');
  });

  it('turns autocorrect off for search fields', () => {
    expect(searchInputProps.autoCorrect).toBe(false);
    expect(searchInputProps.spellCheck).toBe(false);
  });

  it.each(files.map((file) => [path.relative(ROOT, file), file]))(
    '%s spreads keyboardScrollProps on every scroll container',
    (_name, file) => {
      const source = fs.readFileSync(file, 'utf8');
      const containers = count(source, /<(?:ScrollView|FlatList|SectionList)\b/g);
      const spreads = count(source, /\{\.\.\.keyboardScrollProps\}/g);
      expect(spreads).toBeGreaterThanOrEqual(containers);
    }
  );

  it.each(files.map((file) => [path.relative(ROOT, file), file]))(
    '%s spreads searchInputProps on every search field',
    (_name, file) => {
      const source = fs.readFileSync(file, 'utf8');
      // A TextInput opening tag whose placeholder mentions "search"; the tempered match
      // stops at the end of the tag so it can't pick up a later input's placeholder.
      const searchFields = count(
        source,
        /<TextInput(?:(?!\/>)[\s\S])*?placeholder="[^"]*search/gi
      );
      const spreads = count(source, /\{\.\.\.searchInputProps\}/g);
      expect(spreads).toBeGreaterThanOrEqual(searchFields);
    }
  );
});
