// Functional glob utility - no loops, no let, only const
export const glob = async (pattern: string): Promise<string[]> => {
  const globPattern = pattern.includes("*") ? pattern : `**/${pattern}`;
  const globIterator = new Bun.Glob(globPattern).scan({
    absolute: true,
    cwd: process.cwd(),
  });
  return Array.fromAsync(globIterator);
};
