export default function Busy({ text }) {
  if (!text) return null
  return (
    <div className="busy">
      <span className="spinner" />
      {text}
    </div>
  )
}
