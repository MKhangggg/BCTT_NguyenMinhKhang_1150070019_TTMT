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
          <span className="eyebrow">Thời gian thực</span>
          <h2>Hoạt động</h2>
          <p className="muted">Các thay đổi trên bảng được ghi nhận qua SignalR khi bạn đang làm việc.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<Activity size={20} />} label="Sự kiện trực tiếp" value={liveNotifications.length} hint="phiên này" tone="blue" />
        <StatCard icon={<Bell size={20} />} label="Chưa đọc" value={unread} hint="cần xem" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Đã đọc" value={liveNotifications.length - unread} hint="đã mở" tone="green" />
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
        {liveNotifications.length === 0 && <div className="empty-inline"><strong>Chưa có hoạt động trực tiếp</strong><span>Mở một bảng và thay đổi thẻ/cột để xem sự kiện tại đây.</span></div>}
      </div>
    </section>
  )
}

export default ActivityPage
