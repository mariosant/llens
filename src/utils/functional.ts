// Function composition - left to right
export const pipe =
  <A>(a: A) =>
  <B>(...fns: Array<(x: A) => A>) =>
    fns.reduce((acc, fn) => fn(acc), a);

// Function composition - right to left (traditional compose)
export const flow =
  <A, B>(...fns: Array<(a: unknown) => unknown>) =>
  (input: A): B =>
    fns.reduceRight<unknown>((acc, fn) => fn(acc), input) as B;

// Array utilities (point-free style)
export const mapArray =
  <T, U>(fn: (x: T) => U) =>
  (arr: readonly T[]): U[] =>
    arr.map(fn);

export const filterArray =
  <T>(fn: (x: T) => boolean) =>
  (arr: readonly T[]): T[] =>
    arr.filter(fn);

export const reduceArray =
  <T, U>(fn: (acc: U, x: T) => U, init: U) =>
  (arr: readonly T[]): U =>
    arr.reduce(fn, init);

export const flatMapArray =
  <T, U>(fn: (x: T) => readonly U[]) =>
  (arr: readonly T[]): U[] =>
    arr.flatMap(fn);

export const findArray =
  <T>(fn: (x: T) => boolean) =>
  (arr: readonly T[]): T | undefined =>
    arr.find(fn);

export const someArray =
  <T>(fn: (x: T) => boolean) =>
  (arr: readonly T[]): boolean =>
    arr.some(fn);

export const everyArray =
  <T>(fn: (x: T) => boolean) =>
  (arr: readonly T[]): boolean =>
    arr.every(fn);

// Async array utilities
export const traverse =
  <T, U>(fn: (x: T) => Promise<U>) =>
  (arr: readonly T[]): Promise<U[]> =>
    Promise.all(arr.map(fn));

export const traverseSeq =
  <T, U>(fn: (x: T) => Promise<U>) =>
  async (arr: readonly T[]): Promise<U[]> => {
    const results: U[] = [];
    for (const item of arr) {
      results.push(await fn(item));
    }
    return results;
  };

// Object utilities
export const pick =
  <T, K extends keyof T>(keys: readonly K[]) =>
  (obj: T): Pick<T, K> =>
    Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>;

export const omit =
  <T extends Record<string, unknown>, K extends keyof T>(keys: readonly K[]) =>
  (obj: T): Omit<T, K> => {
    const keySet = new Set(keys);
    return Object.fromEntries(
      Object.entries(obj).filter(([k]) => !keySet.has(k as K)),
    ) as Omit<T, K>;
  };

// Conditional utilities (replacing if/else)
export const when =
  <T, U>(predicate: (x: T) => boolean, fn: (x: T) => U) =>
  (x: T): U | T =>
    predicate(x) ? fn(x) : x;

export const unless =
  <T, U>(predicate: (x: T) => boolean, fn: (x: T) => U) =>
  (x: T): U | T =>
    predicate(x) ? x : fn(x);

// Pattern matching helper
export const match =
  <T, U>(
    cases: { [K in T extends string ? T : never]?: (x: T) => U } & {
      _: (x: T) => U;
    },
  ) =>
  (value: T): U => {
    const key = value as T extends string ? T : never;
    return (cases[key] ?? cases._)(value);
  };
