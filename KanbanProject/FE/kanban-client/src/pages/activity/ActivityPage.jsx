import { useMemo } from 'react'
import { Activity, Bell, CheckCircle2 } from 'lucide-react'
import StatCard from '../../components/common/StatCard.jsx'
import { useBoard } from '../../hooks/useBoard'

function ActivityPage() {
  const { liveNotifications, markLiveNotificationAsRead } = useBoard()
  const unread = useMemo(() => liveNotifications.filter((item) => !item.isRead).length, [liveNotifications])

  return (
    <section className="page stack">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Realtime</span>
          <h2>Activity</h2>
          <p className="muted">Live board changes captured from SignalR while you are working.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<Activity size={20} />} label="Su kien truc tiep" value={liveNotifications.length} hint="phien nay" tone="blue" />
        <StatCard icon={<Bell size={20} />} label="Unread" value={unread} hint="needs review" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Read" value={liveNotifications.length - unread} hint="already opened" tone="green" />
      </div>

      <div className="work-list">
        {liveNotifications.map((item) => (
          <button className={`work-row ${item.isRead ? '' : 'unread'}`} type="button" key={item.id} onClick={() => markLiveNotificationAsRead(item.id)}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.message}</span>
            </div>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </button>
        ))}
        {liveNotifications.length === 0 && <div className="empty-inline"><strong>Chua co hoat dong truc tiep</strong><span>Mo mot board va thay doi the/cot de xem su kien tai day.</span></div>}
      </div>
    </section>
  )
}

export default ActivityPage