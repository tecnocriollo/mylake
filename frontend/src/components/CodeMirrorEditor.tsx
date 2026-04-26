import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'

interface CodeMirrorEditorProps {
  height?: string
  language?: 'python' | 'markdown'
  value: string
  onChange?: (value: string) => void
  options?: {
    lineNumbers?: boolean
    readOnly?: boolean
  }
}

export default function CodeMirrorEditor({ 
  height = '150px', 
  language = 'python',
  value, 
  onChange,
  options = {}
}: CodeMirrorEditorProps) {
  const extensions = language === 'python' ? [python()] : [markdown()]
  
  return (
    <CodeMirror
      value={value}
      height={height}
      theme={oneDark}
      extensions={extensions}
      onChange={(newValue) => onChange?.(newValue)}
      editable={!options.readOnly}
      basicSetup={{
        lineNumbers: options.lineNumbers !== false,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: false,
      }}
      className="border rounded"
    />
  )
}