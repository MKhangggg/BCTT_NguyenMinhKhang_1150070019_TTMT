import { useContext } from 'react'
import { BoardContext } from '../context/BoardContext.jsx'

export function useBoard() {
  const context = useContext(BoardContext)
  if (!context) {
    throw new Error('useBoard phải được dùng bên trong BoardProvider')
  }
  return context
}
