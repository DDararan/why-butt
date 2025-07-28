declare module '@milkdown/core' {
  export class Editor {
    static make(): Editor;
    config(callback: (ctx: EditorContext) => void): Editor;
    use(plugin: any): Editor;
    action(callback: (ctx: EditorContext) => any): any;
  }
  
  export interface EditorContext {
    set(key: any, value: any): void;
    get(key: any): any;
  }
  
  export const rootCtx: unique symbol;
  export const defaultValueCtx: unique symbol;
}

declare module '@milkdown/theme-tokyo' {
  export const tokyo: any;
}

declare module '@milkdown/theme-nord' {
  export const nord: any;
}

declare module '@milkdown/react' {
  import { Editor } from '@milkdown/core';
  import { FC } from 'react';

  export function useEditor(callback: (root: HTMLElement) => Editor): { editor: Editor };
  
  export interface ReactEditorProps {
    editor: Editor | null;
  }
  
  export const ReactEditor: FC<ReactEditorProps>;
}

declare module '@milkdown/preset-commonmark' {
  export const commonmark: any;
}

declare module '@milkdown/preset-gfm' {
  export const gfm: any;
}

declare module '@milkdown/plugin-menu' {
  export const menu: any;
}

declare module '@milkdown/plugin-slash' {
  export const slash: any;
}

declare module '@milkdown/plugin-tooltip' {
  export const tooltip: any;
}

declare module '@milkdown/plugin-history' {
  export const history: any;
}

declare module '@milkdown/plugin-listener' {
  import { EditorContext } from '@milkdown/core';

  export interface ListenerConfig {
    markdown?: Array<(ctx: EditorContext, markdown: string) => void>;
  }

  export const listener: any;
  export const listenerCtx: unique symbol;
}

declare module '@milkdown/plugin-indent' {
  export const indent: any;
}

declare module '@milkdown/plugin-clipboard' {
  export const clipboard: any;
}

declare module '@milkdown/plugin-cursor' {
  export const cursor: any;
}

declare module '@milkdown/plugin-prism' {
  export const prism: any;
}

declare module '@milkdown/plugin-upload' {
  export const upload: any;
}

declare module '@milkdown/plugin-emoji' {
  export const emoji: any;
}

declare module '@milkdown/plugin-math' {
  export const math: any;
}

declare module '@milkdown/plugin-diagram' {
  export const diagram: any;
}

declare module '@milkdown/plugin-table' {
  export const table: any;
}

declare module '@milkdown/prose/model' {
  export class Node {
    get textContent(): string;
  }
} 