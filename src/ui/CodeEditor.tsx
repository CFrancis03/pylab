import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { bracketMatching, defaultHighlightStyle, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState } from '@codemirror/state'
import { oneDarkHighlightStyle, oneDarkTheme } from '@codemirror/theme-one-dark'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { useIsDark } from './useIsDark'

// One Dark's red and comment grey fall just under the 4.5:1 contrast minimum on its background, so brighten those two.
const BRIGHTER: Record<string, string> = { '#e06c75': '#f08a93', '#7d8799': '#9aa3b5' }
const darkHighlight = HighlightStyle.define(
  oneDarkHighlightStyle.specs.map((s) => (s.color && BRIGHTER[s.color.toLowerCase()] ? { ...s, color: BRIGHTER[s.color.toLowerCase()] } : s)),
)
const DARK = [oneDarkTheme, syntaxHighlighting(darkHighlight)]
const LIGHT = syntaxHighlighting(defaultHighlightStyle)

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
    // Tab indents inside the editor, which would trap keyboard users. Esc, then Tab, lets focus move on.
    let tabEscape = false
    const leaveOrIndent = (indent: typeof indentMore) => (view: EditorView) => {
      if (tabEscape) {
        tabEscape = false
        return false
      }
      return indent(view)
    }
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          // Wrapping avoids a horizontal scrollbar inside the editor, which is awkward on a phone and for keyboard users.
          EditorView.lineWrapping,
          history(),
          indentOnInput(),
          bracketMatching(),
          python(),
          EditorState.tabSize.of(4),
          EditorState.readOnly.of(!!readOnly),
          keymap.of([
            { key: 'Mod-Enter', run: () => (cb.current.onRun?.(), true) },
            { key: 'Escape', run: () => ((tabEscape = true), true) },
            { key: 'Tab', run: leaveOrIndent(indentMore), shift: leaveOrIndent(indentLess) },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          theme.current.of(dark ? DARK : LIGHT),
          EditorView.contentAttributes.of({ 'aria-label': label, 'data-testid': 'editor-content' }),
          EditorView.domEventHandlers({
            blur: () => {
              tabEscape = false
            },
            keydown: (e) => {
              if (!['Tab', 'Escape', 'Shift'].includes(e.key)) tabEscape = false
              return false
            },
          }),
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
    view.current?.dispatch({ effects: theme.current.reconfigure(dark ? DARK : LIGHT) })
  }, [dark])

  return <div className="editor" ref={host} data-testid="editor" />
}
