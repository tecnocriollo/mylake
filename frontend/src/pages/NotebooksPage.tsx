import MobileNotebook from '../components/MobileNotebook'

interface NotebooksPageProps {
  token: string
}

function NotebooksPage({ token }: NotebooksPageProps) {
  return (
    <div className="h-[calc(100vh-100px)]">
      <MobileNotebook token={token} />
    </div>
  )
}

export default NotebooksPage