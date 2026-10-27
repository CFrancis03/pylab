import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { useIsDark } from './useIsDark'

interface Props {
  value: string
  onChange: (v: string) => void
  /** Ctrl/Cmd+Enter. */
  onRun?: () => void
  label: string
  readOnly?: boolean
}

/** Thin CodeMirror 6 wrapper. The document is owned by the editor; `value` syncs external resets. */
export default function CodeEditor({ value, onChange, onRun, label, readOnly }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const theme = useRef(new Compartment())
  const cb = useRef({ onChange, onRun })
  const dark = useIsDark()

  useEffect(() => {
    cb.current = { onChange, onRun }
  })

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          indentOnInput(),
          bracketMatching(),
          python(),
          EditorState.tabSize.of(4),
          EditorState.readOnly.of(!!readOnly),
          keymap.of([
            { key: 'Mod-Enter', run: () => (cb.current.onRun?.(), true) },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          theme.current.of(dark ? oneDark : syntaxHighlighting(defaultHighlightStyle)),
          EditorView.contentAttributes.of({ 'aria-label': label, 'data-testid': 'editor-content' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = v
    return () => v.destroy()
    // The editor is created once; value/theme changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => {
    view.current?.dispatch({ effects: theme.current.reconfigure(dark ? oneDark : syntaxHighlighting(defaultHighlightStyle)) })
  }, [dark])

  return <div className="editor" ref={host} data-testid="editor" />
}
