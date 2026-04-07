export async function glob(pattern: string): Promise<string[]> {
  // Simple glob implementation - use Bun's native glob
  const files: string[] = [];
  const globPattern = pattern.includes("*") 
    ? pattern 
    : `**/${pattern}`;
  
  for await (const file of new Bun.Glob(globPattern).scan({
    absolute: true,
    cwd: process.cwd(),
  })) {
    files.push(file);
  }
  
  return files;
}
