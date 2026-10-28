import { useUpdate } from '../pwa'

/** Shown when a newer version of the site has been downloaded and is waiting. */
export default function UpdateBanner() {
  const apply = useUpdate()
  if (!apply) return null
  return (
    <div className="update-banner" role="status" data-testid="update-banner">
      <span>A new version is ready.</span>
      <button onClick={apply}>Reload to update</button>
    </div>
  )
}
