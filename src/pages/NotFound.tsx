import { href } from '../router'

export default function NotFound() {
  return (
    <main className="page">
      <h1>Lost in the tall grass 🌾</h1>
      <p className="lead">That page does not exist. <a href={href('/')}>Back to the map</a>.</p>
    </main>
  )
}
