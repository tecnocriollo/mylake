import { useParams } from 'react-router-dom'
import MobileNotebook from '../components/MobileNotebook'

interface NotebookEditorProps {
  token: string
}

export default function NotebookEditor({ token }: NotebookEditorProps) {
  const { path } = useParams()
  
  return (
    <div className="h-screen flex flex-col">
      <MobileNotebook token={token} notebookPath={path} />
    </div>
  )
}
