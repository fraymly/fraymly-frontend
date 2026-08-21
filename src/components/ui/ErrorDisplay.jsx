export function ErrorDisplay({ error }) {
  const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unknown error occurred.')
  return (
    <div className="p-4 my-4 text-sm text-red-800 bg-red-100 rounded-lg border border-red-200" role="alert">
      <span className="font-bold">Error:</span> {errorMessage}
    </div>
  )
}