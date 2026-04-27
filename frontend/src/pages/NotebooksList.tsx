import NotebookEditor from '../components/NotebookEditor'

interface NotebooksListProps {
  token: string
}

function NotebooksList({ token }: NotebooksListProps) {
  return (
    <div className="h-[calc(100vh-100px)]">
      <NotebookEditor token={token} />
    </div>
  )
}

export default NotebooksList
