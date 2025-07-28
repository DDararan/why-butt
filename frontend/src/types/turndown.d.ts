declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    horizontalRule?: string;
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: '```' | '~~~';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '__' | '**';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
  }

  interface Rule {
    filter: string | string[] | ((node: Node) => boolean);
    replacement?: (content: string, node: Node, options?: TurndownOptions) => string;
  }

  class TurndownService {
    constructor(options?: TurndownOptions);
    addRule(key: string, rule: Rule): this;
    keep(filter: string | string[]): this;
    remove(filter: string | string[]): this;
    use(plugin: (service: TurndownService) => void): this;
    turndown(html: string | Node): string;
  }

  export = TurndownService;
} 