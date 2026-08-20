import { IPlatformAdapter } from '../adapters/IPlatformAdapter';
import { IProblemContext } from '../shared/types';

// Hard limits to prevent Gemini quota burn or extension crashes
const MAX_STATEMENT_LENGTH = 5000;
const MAX_CODE_LENGTH = 20000;

function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  // Remove scripts or overly malicious tags if they exist (though innerText usually avoids it)
  // Limit length
  let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.trim();
  if (sanitized.length > MAX_STATEMENT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_STATEMENT_LENGTH) + '... [TRUNCATED]';
  }
  return sanitized.length > 0 ? sanitized : null;
}

export class LeetCodeAdapter implements IPlatformAdapter {
  public isSupported(): boolean {
    return window.location.hostname.includes('leetcode.com') || window.location.pathname.includes('mock/leetcode');
  }

  public async detectProblem(): Promise<Partial<IProblemContext>> {
    const url = window.location.href;
    
    // Multiple fallback selectors for the title
    const titleEl = 
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector('div.flex.items-start.justify-between h1') ||
      document.querySelector('.mr-2.text-label-1');
      
    const title = titleEl ? (titleEl.textContent || '').trim() : null;

    return {
      platform: 'leetcode',
      url,
      title: sanitizeText(title),
    };
  }

  public async scrapeContext(): Promise<Partial<IProblemContext>> {
    // Statement
    const statementEl = 
      document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector('.elfjS'); // Typical LeetCode dynamic class for statement
      
    const statementText = statementEl ? (statementEl as HTMLElement).innerText : null;

    // Examples and Constraints
    const constraints: string[] = [];
    const examples: Array<{ input: string; output: string }> = [];
    
    // Try to parse out of the statement element
    if (statementEl) {
      // Find ul items under constraints
      const strongTags = Array.from(statementEl.querySelectorAll('strong'));
      
      const constraintHeader = strongTags.find(t => t.textContent?.toLowerCase().includes('constraints'));
      if (constraintHeader && constraintHeader.parentElement?.nextElementSibling?.tagName === 'UL') {
        const ul = constraintHeader.parentElement.nextElementSibling;
        Array.from(ul.querySelectorAll('li')).forEach(li => {
          if (li.textContent) constraints.push(sanitizeText(li.textContent)!);
        });
      }
    }

    return {
      statement: sanitizeText(statementText),
      constraints: constraints.length > 0 ? constraints : null,
      examples: examples.length > 0 ? examples : null,
    };
  }

  private async extractCodeFromPageContext(): Promise<string | null> {
    return new Promise((resolve) => {
      const messageId = 'ext_code_extract_' + Math.random().toString(36).substr(2, 9);
      
      // Listener to receive the message from the page context
      const listener = (event: MessageEvent) => {
        if (event.source !== window || event.data.type !== 'STUDYPULSE_CODE_EXTRACT' || event.data.id !== messageId) {
          return;
        }
        window.removeEventListener('message', listener);
        resolve(event.data.code);
      };
      
      window.addEventListener('message', listener);
      
      // We also add a timeout so it doesn't hang forever
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve(null);
      }, 1000);

      // Inject the script
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          let code = null;
          try {
            // Priority 1: Monaco
            if (window.monaco && window.monaco.editor && window.monaco.editor.getModels().length > 0) {
              code = window.monaco.editor.getModels()[0].getValue();
            } 
            // Priority 2: CodeMirror fallback (very old Leetcode)
            else if (document.querySelector('.CodeMirror')) {
              const cm = document.querySelector('.CodeMirror').CodeMirror;
              if (cm) {
                code = cm.getValue();
              }
            }
          } catch(e) {
            console.error('StudyPulse extraction error:', e);
          }
          window.postMessage({ type: 'STUDYPULSE_CODE_EXTRACT', id: '${messageId}', code: code }, '*');
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove(); // Cleanup immediately
    });
  }

  public async getCode(): Promise<Partial<IProblemContext>> {
    // Language detection
    const langBtn = 
      document.querySelector('button.rounded.items-center.whitespace-nowrap.inline-flex.bg-transparent.text-label-2') ||
      document.querySelector('[data-cy="lang-select"]');
      
    const language = langBtn ? (langBtn.textContent || '').trim() : null;

    // Code extraction
    // Priority 1 & 2: Page context (Monaco/CodeMirror)
    let code = await this.extractCodeFromPageContext();
    
    // Priority 3: DOM Fallback
    if (!code) {
      const lines = document.querySelectorAll('.view-lines .view-line');
      if (lines.length > 0) {
        code = Array.from(lines)
          .map(line => (line as HTMLElement).innerText || (line.textContent || ''))
          .join('\n');
      }
    }

    if (code && code.length > MAX_CODE_LENGTH) {
      code = code.substring(0, MAX_CODE_LENGTH) + '\n... [TRUNCATED]';
    }

    return {
      language: sanitizeText(language),
      code: code ? code : null,
      codeStatus: code ? 'available' : 'unavailable'
    } as Partial<IProblemContext> & { codeStatus?: string }; // Adhoc cast to allow new field temporarily
  }

  public async extractAll(): Promise<IProblemContext> {
    const problem = await this.detectProblem();
    const context = await this.scrapeContext();
    const code = await this.getCode();
    
    return {
      platform: 'leetcode',
      url: window.location.href,
      title: null,
      statement: null,
      constraints: null,
      examples: null,
      language: null,
      code: null,
      ...problem,
      ...context,
      ...code
    } as IProblemContext & { codeStatus?: string }; // Allowing codeStatus
  }
}
