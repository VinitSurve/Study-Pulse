import { IProblemContext } from '../shared/types';

export interface IPlatformAdapter {
  isSupported(): boolean;
  detectProblem(): Promise<Partial<IProblemContext>>;
  scrapeContext(): Promise<Partial<IProblemContext>>;
  getCode(): Promise<Partial<IProblemContext>>;
  extractAll(): Promise<IProblemContext>;
}
