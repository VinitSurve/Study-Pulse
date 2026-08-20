export interface IProblemContext {
  platform: string;
  url: string;
  title: string | null;
  statement: string | null;
  constraints: string[] | null;
  examples: Array<{ input: string; output: string }> | null;
  language: string | null;
  code: string | null;
}
