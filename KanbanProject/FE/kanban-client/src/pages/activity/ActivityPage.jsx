import { useMemo, useState } from 'react'
import { Activity, Bell, CheckCircle2, CircleDot, Filter, Radio } from 'lucide-react'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { useBoard } from '../../hooks/useBoard'

const filters = [
  { value: 'All', label: 'Tất cả' },
  { value: 'Unread', label: 'Chưa đọc' },
  { value: 'Read', label: 'Đã đọc' },
]

function ActivityPage() {
  const { liveNotifications, markLiveNotificationAsRead } = useBoard()
  const [filter, setFilter] = useState('All')
  const unread = useMemo(() => liveNotifications.filter((item) => !item.isRead).length, [liveNotifications])
  const filteredNotifications = useMemo(() => liveNotifications.filter((item) => (
    filter === 'All'
      || (filter === 'Unread' && !item.isRead)
      || (filter === 'Read' && item.isRead)
  )), [filter, liveNotifications])

  return (
    <section className="page stack">
      <div className="page-hero compact-hero activity-hero">
        <div>
          <span className="eyebrow">Thời gian thực</span>
          <h2>Hoạt động</h2>
          <p>Các thay đổi trên bảng được ghi nhận qua SignalR khi bạn đang làm việc.</p>
        </div>
        <Radio size={42} />
      </div>

      <div className="stats-grid">
        <StatCard icon={<Activity size={20} />} label="Sự kiện trực tiếp" value={liveNotifications.length} hint="phiên này" tone="blue" />
        <StatCard icon={<Bell size={20} />} label="Chưa đọc" value={unread} hint="cần xem" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Đã đọc" value={liveNotifications.length - unread} hint="đã mở" tone="green" />
      </div>

      <div className="activity-filterbar">
        <span><Filter size={16} /> Lọc hoạt động</span>
        <div className="quick-filterbar inline">
          {filters.map((item) => (
            <button className={`quick-filter ${filter === item.value ? 'is-active' : ''}`} type="button" key={item.value} onClick={() => setFilter(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Activity size={24} />}
          title="Chưa có hoạt động phù hợp"
          description="Mở một bảng và thay đổi thẻ/cột để xem sự kiện realtime tại đây."
        />
      ) : (
        <div className="activity-timeline-list">
          {filteredNotifications.map((item) => (
            <button className={`activity-event ${item.isRead ? '' : 'unread'}`} type="button" key={item.id} onClick={() => markLiveNotificationAsRead(item.id)}>
              <span className="activity-event-dot"><CircleDot size={16} /></span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default ActivityPage
