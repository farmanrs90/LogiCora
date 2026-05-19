interface Props {
  message: string
}

function ErrorMessage({ message }: Props) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <span className="text-red-500 text-sm font-medium">{message}</span>
    </div>
  )
}

export default ErrorMessage
