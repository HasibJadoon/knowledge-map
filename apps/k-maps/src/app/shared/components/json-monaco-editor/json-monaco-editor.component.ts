import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

declare const require: { config: (cfg: { paths: Record<string, string> }) => void };
declare const monaco: typeof import('monaco-editor');

let monacoLoaded = false;
let monacoLoadPromise: Promise<void> | null = null;

function loadMonaco(): Promise<void> {
  if (monacoLoaded) return Promise.resolve();
  if (monacoLoadPromise) return monacoLoadPromise;

  monacoLoadPromise = new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js';
    script.onload = () => {
      (window as any).require.config({
        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' },
      });
      (window as any).require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        resolve();
      });
    };
    document.head.appendChild(script);
  });

  return monacoLoadPromise;
}

@Component({
  selector: 'km-json-monaco-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #editorContainer class="jme__container"></div>`,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .jme__container { width: 100%; height: 100%; }
  `],
})
export class JsonMonacoEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorContainer') containerRef!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  private editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
  private ignoreNextChange = false;

  ngAfterViewInit(): void {
    loadMonaco().then(() => this.initEditor());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.editor) {
      const currentValue = this.editor.getValue();
      if (currentValue !== this.value) {
        this.ignoreNextChange = true;
        this.editor.setValue(this.value);
      }
    }
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
    this.editor = null;
  }

  private initEditor(): void {
    const container = this.containerRef?.nativeElement;
    if (!container || this.editor) return;

    const m = (window as any).monaco as typeof monaco;

    this.editor = m.editor.create(container, {
      value: this.value,
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 12,
      lineHeight: 20,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      fontLigatures: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      formatOnPaste: true,
      tabSize: 2,
      renderLineHighlight: 'line',
      bracketPairColorization: { enabled: true },
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      padding: { top: 12, bottom: 12 },
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.ignoreNextChange) { this.ignoreNextChange = false; return; }
      this.valueChange.emit(this.editor!.getValue());
    });
  }
}
