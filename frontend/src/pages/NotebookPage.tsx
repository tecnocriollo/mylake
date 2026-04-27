import { useParams } from 'react-router-dom'
import NotebookEditor from '../components/NotebookEditor'

interface NotebookPageProps {
  token: string
}

export default function NotebookPage({ token }: NotebookPageProps) {
  const { path } = useParams()

  return (
    <div className="h-screen flex flex-col">
      <NotebookEditor token={token} notebookPath={path} />
    </div>
  )
}
