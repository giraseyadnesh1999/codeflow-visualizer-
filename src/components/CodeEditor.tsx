'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { createTheme } from '@uiw/codemirror-themes'
import { EditorView, Decoration, keymap, type DecorationSet } from '@codemirror/view'
import { Prec, StateEffect, StateField, type Extension } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'
import type { Loc } from '@/lib/interpreter/evaluator'

/* ---- highlight plumbing ------------------------------------------- */

interface Highlight {
  loc: Loc | null
  errorLine: number
}

const setHighlight = StateEffect.define<Highlight>()

const activeLine = Decoration.line({ class: 'cf-active' })
const errorLine = Decoration.line({ class: 'cf-error-line' })
const activeToken = Decoration.mark({ class: 'cf-token' })

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes)
    for (const effect of tr.effects) {
      if (!effect.is(setHighlight)) continue
      const { loc, errorLine: errLine } = effect.value
      const ranges = []
      const lineCount = tr.state.doc.lines

      if (errLine >= 1 && errLine <= lineCount) {
        ranges.push(errorLine.range(tr.state.doc.line(errLine).from))
      }

      if (loc && loc.line >= 1 && loc.line <= lineCount) {
        const line = tr.state.doc.line(loc.line)
        ranges.push(activeLine.range(line.from))

        // Mark the exact expression when it sits on a single line.
        if (loc.endLine === loc.line) {
          const from = Math.min(line.from + loc.col, line.to)
          const to = Math.min(line.from + loc.endCol, line.to)
          if (to > from && to - from < 160) ranges.push(activeToken.range(from, to))
        }
      }

      next = Decoration.set(ranges, true)
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

/* ---- theme --------------------------------------------------------- */

const codeflowTheme = createTheme({
  theme: 'dark',
  settings: {
    background: 'transparent',
    backgroundImage: '',
    foreground: '#e5e1f2',
    caret: '#f0abfc',
    selection: 'rgba(168,85,247,0.28)',
    selectionMatch: 'rgba(34,211,238,0.18)',
    lineHighlight: 'transparent',
    gutterBackground: 'transparent',
    gutterForeground: 'rgba(255,255,255,0.22)',
    gutterBorder: 'transparent',
    fontFamily: 'var(--font-mono)',
  },
  styles: [
    { tag: t.comment, color: '#6b6486', fontStyle: 'italic' },
    { tag: [t.keyword, t.moduleKeyword], color: '#e879f9' },
    { tag: [t.controlKeyword, t.operatorKeyword], color: '#f472b6' },
    { tag: [t.string, t.special(t.string)], color: '#a3e635' },
    { tag: [t.number, t.bool, t.null], color: '#22d3ee' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#c4b5fd' },
    { tag: [t.definition(t.variableName)], color: '#f5d0fe' },
    { tag: t.variableName, color: '#e5e1f2' },
    { tag: [t.propertyName], color: '#7dd3fc' },
    { tag: [t.className, t.typeName], color: '#fbbf24' },
    { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: '#8b83a8' },
    { tag: [t.definitionKeyword], color: '#e879f9' },
    { tag: t.self, color: '#fb7185' },
    { tag: t.invalid, color: '#fb7185' },
  ],
})

const extraTheme = EditorView.theme({
  '.cf-error-line': {
    background: 'linear-gradient(90deg, rgba(248,113,113,.20), transparent 70%)',
    boxShadow: 'inset 2px 0 0 0 #f87171',
  },
  '.cm-content': { padding: '10px 0' },
  '.cm-line': { padding: '0 14px 0 10px' },
  '.cm-gutters': { paddingLeft: '4px' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 6px', minWidth: '30px' },
})

const EXTENSIONS: Extension[] = [javascript(), highlightField, extraTheme, EditorView.lineWrapping]

/* ---- component ----------------------------------------------------- */

export function CodeEditor({
  value,
  onChange,
  loc,
  errorLine = 0,
  follow = true,
  readOnly = false,
  onRun,
  onSubmit,
}: {
  value: string
  onChange?: (next: string) => void
  loc: Loc | null
  errorLine?: number
  /** Scroll the active line into view as execution moves. */
  follow?: boolean
  readOnly?: boolean
  /** Bound to Ctrl/Cmd+Enter. */
  onRun?: () => void
  /** Bound to Ctrl/Cmd+Shift+Enter. */
  onSubmit?: () => void
}) {
  const viewRef = useRef<EditorView | null>(null)
  const runRef = useRef(onRun)
  const submitRef = useRef(onSubmit)

  useEffect(() => {
    runRef.current = onRun
    submitRef.current = onSubmit
  }, [onRun, onSubmit])

  // Built once; the handlers are read through refs so they are always current.
  const extensions = useMemo(
    () => [
      ...EXTENSIONS,
      Prec.highest(
        keymap.of([
          { key: 'Mod-Shift-Enter', run: () => (submitRef.current ? (submitRef.current(), true) : false) },
          { key: 'Mod-Enter', run: () => (runRef.current ? (runRef.current(), true) : false) },
        ]),
      ),
    ],
    [],
  )

  const onCreate = useCallback((view: EditorView) => {
    viewRef.current = view
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const effects: StateEffect<unknown>[] = [setHighlight.of({ loc, errorLine })]

    if (follow && loc && loc.line >= 1 && loc.line <= view.state.doc.lines) {
      const pos = view.state.doc.line(loc.line).from
      effects.push(EditorView.scrollIntoView(pos, { y: 'center', yMargin: 60 }))
    }

    view.dispatch({ effects })
  }, [loc, errorLine, follow, value])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onCreateEditor={onCreate}
      theme={codeflowTheme}
      extensions={extensions}
      editable={!readOnly}
      readOnly={readOnly}
      height="100%"
      className="h-full"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
        searchKeymap: false,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
        tabSize: 2,
      }}
    />
  )
}
