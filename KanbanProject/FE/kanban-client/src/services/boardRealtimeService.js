import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'

const getHubUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  return apiUrl.replace(/\/api\/?$/, '/hubs/board')
}

export const createBoardRealtimeConnection = ({ boardId, onBoardChanged, onBoardListChanged, onDirectMessageChanged, onStatusChanged }) => {
  const connection = new HubConnectionBuilder()
    .withUrl(getHubUrl(), {
      accessTokenFactory: () => localStorage.getItem('kanban_token') || '',
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build()

  const joinBoard = async () => {
    if (!boardId) {
      onStatusChanged?.('connected')
      return
    }

    if (connection.state === HubConnectionState.Connected) {
      await connection.invoke('JoinBoard', Number(boardId))
      onStatusChanged?.('connected')
    }
  }

  connection.on('BoardChanged', (event) => {
    if (!boardId || Number(event?.boardId) === Number(boardId)) {
      onBoardChanged?.(event)
    }
  })

  connection.on('BoardListChanged', (event) => {
    onBoardListChanged?.(event)
  })

  connection.on('DirectMessageChanged', (event) => {
    onDirectMessageChanged?.(event)
  })

  connection.onreconnecting(() => onStatusChanged?.('reconnecting'))
  connection.onreconnected(() => joinBoard().catch(() => onStatusChanged?.('error')))
  connection.onclose(() => onStatusChanged?.('disconnected'))

  return {
    start: async () => {
      onStatusChanged?.('connecting')
      await connection.start()
      await joinBoard()
    },
    stop: async () => {
      if (boardId && connection.state === HubConnectionState.Connected) {
        await connection.invoke('LeaveBoard', Number(boardId)).catch(() => {})
      }

      await connection.stop()
    },
  }
}

export const createWorkspaceRealtimeConnection = ({ onBoardListChanged, onDirectMessageChanged, onStatusChanged }) => (
  createBoardRealtimeConnection({ onBoardListChanged, onDirectMessageChanged, onStatusChanged })
)

export const formatBoardRealtimeNotification = (event) => {
  const actionLabels = {
    CardCreated: 'Thẻ mới được tạo',
    CardUpdated: 'Thẻ vừa được cập nhật',
    CardDeleted: 'Thẻ vừa bị xóa',
    CardMoved: 'Thẻ vừa được di chuyển',
    CardsReordered: 'Thứ tự thẻ vừa thay đổi',
    CardArchived: 'Thẻ vừa được lưu trữ',
    ColumnCreated: 'Cột mới được tạo',
    ColumnUpdated: 'Cột vừa được cập nhật',
    ColumnDeleted: 'Cột vừa bị xóa',
    ColumnsReordered: 'Thứ tự cột vừa thay đổi',
    ProjectOverviewUpdated: 'Tổng quan dự án vừa được cập nhật',
    ProjectDocumentAdded: 'Tài liệu dự án vừa được thêm',
    ProjectDocumentDeleted: 'Tài liệu dự án vừa bị xóa',
    CommentAdded: 'Bình luận mới trong thẻ',
    CommentDeleted: 'Bình luận vừa bị xóa',
    MemberAdded: 'Thành viên mới được thêm',
    MembersAdded: 'Danh sách thành viên vừa cập nhật',
    MemberRoleUpdated: 'Quyền thành viên vừa thay đổi',
    MemberRemoved: 'Thành viên vừa bị xóa khỏi dự án',
    ChatMessageAdded: 'Tin nhắn mới trong dự án',
    ProjectCreated: 'Dự án mới vừa được tạo',
    ProjectUpdated: 'Dự án vừa được cập nhật',
    ProjectDeleted: 'Dự án vừa bị xóa',
    ProjectMembershipChanged: 'Quyền tham gia dự án vừa thay đổi',
  }

  return {
    id: `live-${event?.action || 'BoardChanged'}-${Date.now()}`,
    title: actionLabels[event?.action] || 'Bảng vừa có thay đổi',
    message: `Bảng #${event?.boardId || event?.data?.boardId || ''} được cập nhật theo thời gian thực.`,
    type: event?.action || 'Realtime',
    boardId: event?.boardId || event?.data?.boardId || null,
    cardId: event?.data?.cardId || event?.data?.MovedCardId || event?.data?.movedCardId || null,
    isRead: false,
    isRealtime: true,
    createdAt: event?.changedAtUtc || new Date().toISOString(),
  }
}
